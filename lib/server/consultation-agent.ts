import { emptyHealthContext, type HealthContext, type RiskLevel, type UtteranceIntent } from "@/lib/types";
import type { AssistantTurn } from "@/lib/health-ai";

// Agen percakapan berbasis OpenAI. Paham keluhan apa pun (tidak dibatasi
// daftar gejala), menjaga percakapan tetap dua arah, dan mengisi health
// context dari seluruh dialog. Mengembalikan null bila gagal agar route
// turun ke fallback rule-based.

const BASE_URL = "https://api.openai.com/v1";

function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const INTENTS: UtteranceIntent[] = [
  "SYMPTOM_DESCRIPTION",
  "MEDICAL_INFORMATION_REQUEST",
  "FOLLOW_UP_QUESTION",
  "CLARIFICATION",
  "MEDICATION_QUESTION",
  "PREVIOUS_CONTEXT_REFERENCE",
  "NON_MEDICAL",
  "EMERGENCY_SIGNAL",
];

const RISKS: RiskLevel[] = ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "EMERGENCY_SIGNAL"];

const SYSTEM_PROMPT = `Anda adalah asisten kesehatan suara untuk aplikasi "Healthalk", berbahasa Indonesia, hangat, dan berbicara dua arah seperti agen suara sungguhan.

TUJUAN: membantu pengguna menceritakan keluhannya secara terstruktur, memberi informasi kesehatan UMUM, lalu menyiapkan ringkasan yang bisa dibawa ke dokter. Anda memahami keluhan atau kondisi apa pun yang diceritakan pengguna, bukan hanya daftar gejala tertentu.

ATURAN KETAT:
- JANGAN mendiagnosis. Gunakan bahasa berhati-hati ("kemungkinan", "informasi umum", "ini bukan diagnosis").
- JANGAN menyebut nama obat atau dosis. Jika pengguna bertanya soal obat, arahkan untuk membahasnya dengan dokter atau mengunggah foto resep di fitur Resep nanti.
- JANGAN mengklaim punya jurnal atau referensi; itu bagian lain dari sistem. Anda hanya memberi pengetahuan umum.
- Jawaban SINGKAT karena dibacakan sebagai suara: 1 sampai 4 kalimat. Akhiri dengan SATU pertanyaan lanjutan yang natural, kecuali saat pengguna menutup percakapan atau saat kondisi darurat.
- Akui dulu apa yang diceritakan pengguna ("Baik, saya catat...", "Terima kasih sudah cerita...").
- Jangan mengulang persis pertanyaan Anda sebelumnya.
- Bila ada tanda bahaya (nyeri dada dengan sesak, gejala stroke, perdarahan hebat, tidak sadar, sesak berat, reaksi alergi berat, pikiran menyakiti diri, dll): set intent dan risk ke "EMERGENCY_SIGNAL", minta pengguna segera ke IGD atau menghubungi layanan gawat darurat, dan jawab sesingkat mungkin.
- Perbarui health_context dari SELURUH percakapan, jangan menghapus informasi yang sudah diketahui.

Jawab HANYA dengan objek JSON:
{
  "reply": string,
  "intent": "SYMPTOM_DESCRIPTION" | "MEDICAL_INFORMATION_REQUEST" | "FOLLOW_UP_QUESTION" | "CLARIFICATION" | "MEDICATION_QUESTION" | "PREVIOUS_CONTEXT_REFERENCE" | "NON_MEDICAL" | "EMERGENCY_SIGNAL",
  "risk": "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "EMERGENCY_SIGNAL",
  "health_context": {
    "chief_complaint": string | null,
    "symptoms": string[],
    "duration": string | null,
    "severity": "mild" | "moderate" | "severe" | "unknown",
    "onset": string | null,
    "progression": string | null,
    "associated_symptoms": string[],
    "reported_conditions": string[],
    "medication_information": string[],
    "allergy_information": string[],
    "relevant_history": string[],
    "user_questions": string[]
  }
}`;

interface RawAgentResponse {
  reply?: string;
  intent?: string;
  risk?: string;
  health_context?: Partial<Record<keyof HealthContext, unknown>>;
}

const uniqStrings = (...lists: (unknown[] | undefined)[]): string[] => {
  const seen = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const s = typeof item === "string" ? item.trim() : "";
      if (s) seen.add(s);
    }
  }
  return [...seen];
};

const asString = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};

// Menggabungkan health_context dari model ke konteks berjalan tanpa membuang
// yang sudah terisi. Field skalar dipertahankan begitu terisi; array digabung.
function mergeContext(prev: HealthContext, raw: RawAgentResponse["health_context"]): HealthContext {
  const next = raw ?? {};
  const severity = asString(next.severity);
  return {
    chief_complaint: prev.chief_complaint ?? asString(next.chief_complaint),
    symptoms: uniqStrings(prev.symptoms, next.symptoms as unknown[]),
    duration: prev.duration ?? asString(next.duration),
    severity:
      severity && ["mild", "moderate", "severe"].includes(severity)
        ? (severity as HealthContext["severity"])
        : prev.severity,
    onset: prev.onset ?? asString(next.onset),
    progression: asString(next.progression) ?? prev.progression,
    associated_symptoms: uniqStrings(prev.associated_symptoms, next.associated_symptoms as unknown[]),
    reported_conditions: uniqStrings(prev.reported_conditions, next.reported_conditions as unknown[]),
    medication_information: uniqStrings(
      prev.medication_information,
      next.medication_information as unknown[]
    ),
    allergy_information: uniqStrings(prev.allergy_information, next.allergy_information as unknown[]),
    relevant_history: uniqStrings(prev.relevant_history, next.relevant_history as unknown[]),
    user_questions: uniqStrings(prev.user_questions, next.user_questions as unknown[]),
  };
}

export async function generateAgentTurn(input: {
  query: string;
  healthContext: HealthContext;
  history: { role: "user" | "assistant"; text: string }[];
  lastAssistantText: string;
}): Promise<AssistantTurn | null> {
  if (!isConfigured()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const prevContext = input.healthContext ?? emptyHealthContext();
  const transcript = input.history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Pengguna" : "Asisten"}: ${m.text}`)
    .join("\n");

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Health context sejauh ini (JSON):\n${JSON.stringify(prevContext)}`,
              transcript ? `Ringkasan percakapan sebelumnya:\n${transcript}` : "",
              `Ucapan pengguna sekarang:\n"${input.query}"`,
              input.lastAssistantText
                ? `Pertanyaan terakhir Anda (jangan diulang persis):\n"${input.lastAssistantText}"`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[openai] consultation turn ${res.status} ${res.statusText}, using rule-based fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as RawAgentResponse;
    const reply = asString(parsed.reply);
    if (!reply) return null;

    const rawIntent = typeof parsed.intent === "string" ? parsed.intent : "";
    const rawRisk = typeof parsed.risk === "string" ? parsed.risk : "";
    const intent = (INTENTS as string[]).includes(rawIntent)
      ? (rawIntent as UtteranceIntent)
      : "FOLLOW_UP_QUESTION";
    const risk = (RISKS as string[]).includes(rawRisk) ? (rawRisk as RiskLevel) : "LOW_RISK";

    return {
      text: reply,
      intent,
      evidence: [],
      risk,
      insufficientEvidence: false,
      healthContext: mergeContext(prevContext, parsed.health_context),
    };
  } catch (err) {
    console.warn(
      `[openai] consultation turn failed (${
        err instanceof Error ? err.message : String(err)
      }), using rule-based fallback.`
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
