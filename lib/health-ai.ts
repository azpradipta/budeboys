import {
  emptyHealthContext,
  genId,
  type ConsultationMessage,
  type ConsultationSession,
  type ConsultationSummary,
  type EvidenceReference,
  type HealthContext,
  type RiskLevel,
  type UtteranceIntent,
} from "./types";
import { detectEmergency, searchEvidence } from "./kb";

/**
 * Local, rule-based stand-in for the Conversation Intelligence + Health
 * Evidence Engine described in docs/prd.md (Section 9-24). It exists so the
 * full journey is demoable end-to-end from the frontend alone. Every function
 * here is a thin, swappable seam — replace the body with a real API call and
 * the pages above don't need to change.
 */

const SYMPTOM_KEYWORDS = [
  "demam",
  "batuk",
  "pilek",
  "pusing",
  "sakit kepala",
  "mual",
  "muntah",
  "sakit perut",
  "nyeri",
  "gatal",
  "ruam",
  "lemas",
  "sesak",
  "diare",
  "meriang",
];

const MEDICATION_KEYWORDS = ["obat", "minum obat", "dosis", "resep"];
const QUESTION_MARKERS = ["apa", "kenapa", "bagaimana", "apakah", "berapa", "kapan", "?"];

export function classifyIntent(text: string, hasPriorContext: boolean): UtteranceIntent {
  const t = text.toLowerCase();

  if (detectEmergency(t)) return "EMERGENCY_SIGNAL";
  if (/^(halo|hai|terima kasih|oke|baik)\b/.test(t.trim()) && t.length < 20)
    return "NON_MEDICAL";
  if (MEDICATION_KEYWORDS.some((k) => t.includes(k))) return "MEDICATION_QUESTION";
  if (/\b(tadi|sebelumnya|yang saya bilang)\b/.test(t) && hasPriorContext)
    return "PREVIOUS_CONTEXT_REFERENCE";

  const isQuestion = QUESTION_MARKERS.some((q) => t.includes(q));
  if (isQuestion) {
    return SYMPTOM_KEYWORDS.some((k) => t.includes(k))
      ? "MEDICAL_INFORMATION_REQUEST"
      : "FOLLOW_UP_QUESTION";
  }

  if (SYMPTOM_KEYWORDS.some((k) => t.includes(k))) return "SYMPTOM_DESCRIPTION";
  if (t.length < 12) return "CLARIFICATION";
  return "NON_MEDICAL";
}

const DURATION_RE = /(\d+|se(?:hari|minggu|bulan))\s*(hari|minggu|bulan|jam)/i;

/** Naive NLP extraction — merges new utterance info into existing context
 * without ever overwriting a known field with a guess (PRD 4.4). */
export function extractHealthContext(
  context: HealthContext,
  utterance: string
): HealthContext {
  const t = utterance.toLowerCase();
  const next: HealthContext = {
    ...context,
    symptoms: [...context.symptoms],
    associated_symptoms: [...context.associated_symptoms],
    reported_conditions: [...context.reported_conditions],
    medication_information: [...context.medication_information],
    allergy_information: [...context.allergy_information],
    relevant_history: [...context.relevant_history],
    user_questions: [...context.user_questions],
  };

  const foundSymptoms = SYMPTOM_KEYWORDS.filter((k) => t.includes(k));
  for (const s of foundSymptoms) {
    if (!next.symptoms.includes(s)) {
      if (!next.chief_complaint) next.chief_complaint = s;
      else if (!next.symptoms.includes(s)) next.associated_symptoms.push(s);
      next.symptoms.push(s);
    }
  }

  const durationMatch = t.match(DURATION_RE);
  if (durationMatch && !context.duration) {
    next.duration = durationMatch[0];
    next.onset = `${durationMatch[0]} yang lalu`;
  }

  if (/parah|berat|hebat|sangat sakit/.test(t)) next.severity = "severe";
  else if (/lumayan|sedang/.test(t)) next.severity = "moderate";
  else if (foundSymptoms.length > 0 && next.severity === "unknown") next.severity = "mild";

  if (/makin (parah|berat)|semakin (parah|berat)|bertambah parah/.test(t))
    next.progression = "memburuk";
  else if (/membaik|mendingan|lebih baik/.test(t)) next.progression = "membaik";

  if (/alergi/.test(t)) next.allergy_information.push(utterance.trim());
  if (MEDICATION_KEYWORDS.some((k) => t.includes(k)))
    next.medication_information.push(utterance.trim());
  if (/riwayat|dulu pernah|pernah kena/.test(t))
    next.relevant_history.push(utterance.trim());
  if (QUESTION_MARKERS.some((q) => t.includes(q)))
    next.user_questions.push(utterance.trim());

  return next;
}

export function safetyCheck(text: string): {
  risk: RiskLevel;
  action: "PASS" | "MODIFY" | "BLOCK";
} {
  if (detectEmergency(text)) return { risk: "EMERGENCY_SIGNAL", action: "MODIFY" };
  if (/parah|hebat|tidak tahan/.test(text.toLowerCase()))
    return { risk: "MEDIUM_RISK", action: "PASS" };
  return { risk: "LOW_RISK", action: "PASS" };
}

export interface AssistantTurn {
  text: string;
  intent: UtteranceIntent;
  evidence: EvidenceReference[];
  risk: RiskLevel;
  insufficientEvidence: boolean;
}

/** Generates the assistant's reply for one user utterance, given the running
 * health context. Mirrors the pipeline in Section 14 & 20-24. */
export function generateAssistantTurn(
  utterance: string,
  context: HealthContext,
  hasPriorContext: boolean
): AssistantTurn {
  const intent = classifyIntent(utterance, hasPriorContext);
  const safety = safetyCheck(utterance);

  if (intent === "EMERGENCY_SIGNAL" || safety.risk === "EMERGENCY_SIGNAL") {
    return {
      intent: "EMERGENCY_SIGNAL",
      risk: "EMERGENCY_SIGNAL",
      insufficientEvidence: false,
      evidence: [],
      text:
        "Ini terdengar seperti kondisi darurat. Saya tidak bisa memastikan kondisi Anda dari percakapan ini — mohon segera hubungi layanan gawat darurat atau ke IGD terdekat sekarang.",
    };
  }

  if (intent === "NON_MEDICAL") {
    return {
      intent,
      risk: "LOW_RISK",
      insufficientEvidence: false,
      evidence: [],
      text: "Baik, saya di sini. Silakan ceritakan keluhan kesehatan yang Anda alami.",
    };
  }

  const needsEvidence =
    intent === "MEDICAL_INFORMATION_REQUEST" || intent === "SYMPTOM_DESCRIPTION";

  const query = `${context.chief_complaint ?? ""} ${context.symptoms.join(" ")} ${utterance}`;
  const evidence = needsEvidence ? searchEvidence(query) : [];

  if (needsEvidence && evidence.length === 0) {
    return {
      intent,
      risk: safety.risk,
      insufficientEvidence: true,
      evidence: [],
      text: "Saya belum menemukan evidence yang cukup untuk memberikan jawaban yang dapat dipercaya mengenai hal tersebut. Boleh ceritakan gejala lain atau detail tambahan?",
    };
  }

  let text: string;
  if (intent === "MEDICATION_QUESTION") {
    text =
      "Saya mencatat informasi obat itu. Setelah Anda bertemu dokter dan menerima resep, unggah foto resepnya di halaman Resep agar saya bisa membantu menjelaskan obatnya.";
  } else if (evidence.length > 0) {
    const missingInfo =
      !context.duration || context.symptoms.length < 2
        ? " Agar penilaian lebih akurat, boleh ceritakan sudah berapa lama dan gejala lain yang menyertai?"
        : "";
    text = `Berdasarkan evidence yang saya temukan (${evidence
      .map((e) => e.source.title)
      .join("; ")}), ${evidence[0].snippet} Ini bukan diagnosis — jika ragu, tetap periksakan ke tenaga kesehatan.${missingInfo}`;
  } else {
    text =
      "Baik, saya catat. Boleh ceritakan lebih detail — misalnya sejak kapan dan seberapa berat gejalanya?";
  }

  return { intent, risk: safety.risk, insufficientEvidence: false, evidence, text };
}

export function createMessage(
  role: ConsultationMessage["role"],
  text: string,
  extra: Partial<ConsultationMessage> = {}
): ConsultationMessage {
  return {
    id: genId("msg"),
    role,
    text,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function createSession(): ConsultationSession {
  return {
    id: genId("cons"),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    messages: [
      createMessage(
        "assistant",
        "Halo, saya siap mendengarkan. Silakan ceritakan keluhan kesehatan Anda."
      ),
    ],
    healthContext: emptyHealthContext(),
    encrypted: false,
  };
}

export function generateSummary(session: ConsultationSession): ConsultationSummary {
  const ctx = session.healthContext;
  const allEvidence = session.messages.flatMap((m) => m.evidence ?? []);
  const uniqueEvidence = Array.from(
    new Map(allEvidence.map((e) => [e.source.source_id, e])).values()
  );
  const hadEmergency = session.messages.some((m) => m.risk === "EMERGENCY_SIGNAL");

  const symptoms = ctx.symptoms.length > 0 ? ctx.symptoms : ["Tidak disebutkan"];

  return {
    chief_complaint: ctx.chief_complaint ?? "Tidak disebutkan secara eksplisit",
    reported_symptoms: symptoms,
    duration_onset: ctx.duration ?? "unknown",
    relevant_information: [
      ...ctx.relevant_history,
      ...ctx.allergy_information,
      ...(ctx.progression ? [`Perkembangan gejala: ${ctx.progression}`] : []),
    ],
    questions_discussed: ctx.user_questions,
    ai_preliminary_assessment:
      symptoms[0] !== "Tidak disebutkan"
        ? `Gejala yang dilaporkan (${symptoms.join(", ")}) konsisten dengan kondisi umum yang tercakup pada evidence yang ditemukan. Ini merupakan informasi awal, bukan diagnosis.`
        : "Informasi belum cukup untuk memberikan penilaian awal. Disarankan konsultasi langsung dengan tenaga kesehatan.",
    evidence_discussed: uniqueEvidence,
    recommended_next_step: hadEmergency
      ? "Segera cari bantuan tenaga kesehatan / layanan gawat darurat."
      : "Jadwalkan konsultasi dengan dokter untuk pemeriksaan dan diagnosis lebih lanjut, bawa ringkasan ini sebagai bahan.",
    important_warnings: hadEmergency
      ? ["Terdapat sinyal darurat selama percakapan — prioritaskan penanganan medis segera."]
      : [],
    generated_at: new Date().toISOString(),
  };
}
