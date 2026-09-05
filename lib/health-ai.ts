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
 * Local, rule-based fallback for the Conversation Intelligence + Health
 * Evidence Engine (docs/prd.md Section 9-24). The real implementation is
 * the team's Healthify Intelligence API (see lib/server/healthify-client.ts),
 * called from app/api/consultation/turn and app/api/consultation/summary —
 * those routes fall back to the functions in this file whenever Healthify
 * is unconfigured, unreachable, or errors, so a consultation can still be
 * completed end-to-end either way (PRD Section 49 Availability).
 *
 * Everything here is plain, isomorphic TS (no browser or Node-only APIs),
 * safe to import from a route handler or, historically, from client code.
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

export type SmallTalkKind = "greeting" | "thanks" | "acknowledgement" | "farewell";

const SMALLTALK_PATTERNS: { kind: SmallTalkKind; re: RegExp }[] = [
  {
    kind: "greeting",
    re: /^(halo|hai|hi|hey|helo|pagi|selamat (pagi|siang|sore|malam)|assalam(u'?alaikum)?|permisi)\b/,
  },
  {
    kind: "thanks",
    re: /\b(terima kasih|terimakasih|makasih|mksh|trims|thank(s| you)?)\b/,
  },
  {
    kind: "farewell",
    re: /\b(sampai jumpa|sampai nanti|dadah|bye|sudah dulu|segitu dulu|cukup segitu)\b/,
  },
  {
    kind: "acknowledgement",
    re: /^((oke|ok|okay|okey|baik|baiklah|sip|siap|noted|mengerti|paham|jelas|setuju|betul|deh|dong)[\s.!,]*)+$/,
  },
];

/** Detects social / non-substantive turns ("terima kasih", "oke", "halo")
 * so the assistant replies naturally without running the whole
 * evidence-retrieval pipeline — the conversation stays two-way and evidence
 * only appears when the user actually asks or describes something. */
export function detectSmallTalk(text: string): SmallTalkKind | null {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 48) return null;
  if (t.includes("?")) return null;
  if (QUESTION_MARKERS.some((q) => t.includes(q))) return null;
  if (SYMPTOM_KEYWORDS.some((k) => t.includes(k))) return null;
  return SMALLTALK_PATTERNS.find((p) => p.re.test(t))?.kind ?? null;
}

export function smallTalkReply(kind: SmallTalkKind): string {
  switch (kind) {
    case "greeting":
      return "Halo! Silakan ceritakan keluhan kesehatan Anda, atau tanyakan hal yang ingin Anda ketahui.";
    case "thanks":
      return "Sama-sama. Kalau masih ada yang ingin ditanyakan atau diceritakan, saya siap membantu.";
    case "acknowledgement":
      return "Baik. Silakan lanjutkan bila ada yang ingin ditambahkan.";
    case "farewell":
      return 'Baik, jaga kesehatan ya. Anda bisa menekan "Akhiri Konsultasi" untuk mendapatkan ringkasan sesi ini.';
  }
}

const DURATION_RE =
  /((?:\d+\s*|se\s*|beberapa\s+)(?:hari|minggu|bulan|tahun|jam)(?:an)?|sebulanan|semingguan|seharian|setahunan)/i;

/** Rough conversion of a free-text Indonesian duration to days. */
function parseDurationDays(duration: string | null): number | null {
  if (!duration) return null;
  const t = duration.toLowerCase();
  const numMatch = t.match(/(\d+)/);
  const n = numMatch
    ? parseInt(numMatch[1], 10)
    : t.startsWith("se")
      ? 1
      : t.includes("beberapa")
        ? 3
        : 1;
  if (t.includes("jam")) return n / 24;
  if (t.includes("hari")) return n;
  if (t.includes("minggu")) return n * 7;
  if (t.includes("bulan")) return n * 30;
  if (t.includes("tahun")) return n * 365;
  return null;
}

/** Symptoms lasting ~3 weeks or more are past the "acute, self-limiting"
 * window — they warrant an in-person evaluation regardless of what a
 * generic KB snippet about acute illness says. */
function isChronic(duration: string | null): boolean {
  const days = parseDurationDays(duration);
  return days !== null && days >= 21;
}

const CAPABILITY_RE =
  /\b(bisa (bantu|membantu|nolong|menolong)|kamu (bisa|dapat|mampu)|apa (fungsi|kegunaan|guna|bisa)|kamu (siapa|apa|itu apa)|cara (kerja|pakai|kerjanya))\b/;

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
  // "berusia 5 tahun" is an age, not a symptom duration.
  const looksLikeAge =
    /\b(usia|umur|berusia|umurnya|usianya)\b/.test(t) &&
    /tahun/.test(durationMatch?.[0] ?? "");
  if (durationMatch && !looksLikeAge && !context.duration) {
    next.duration = durationMatch[0].trim();
    next.onset = `${durationMatch[0].trim()} yang lalu`;
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
  /** The health context after folding in this utterance. */
  healthContext: HealthContext;
}

/** Fallback turn generator — used by app/api/consultation/turn when
 * Healthify is unconfigured/unreachable. It's a rule-based safety net, not
 * a substitute for the real engine: it avoids repeating itself, doesn't
 * re-ask for info it already has, and escalates persistent symptoms rather
 * than parroting "acute illness resolves in 1-3 weeks". */
export function generateLocalTurn(
  utterance: string,
  context: HealthContext,
  hasPriorContext: boolean,
  lastAssistantText = ""
): AssistantTurn {
  const t = utterance.toLowerCase();
  const intent = classifyIntent(utterance, hasPriorContext);
  const safety = safetyCheck(utterance);
  const healthContext = extractHealthContext(context, utterance);
  const base = { intent, risk: safety.risk, healthContext };

  if (intent === "EMERGENCY_SIGNAL" || safety.risk === "EMERGENCY_SIGNAL") {
    return {
      ...base,
      intent: "EMERGENCY_SIGNAL",
      risk: "EMERGENCY_SIGNAL",
      evidence: [],
      insufficientEvidence: false,
      text: "Ini terdengar seperti kondisi darurat. Saya tidak bisa memastikan kondisi Anda dari percakapan ini — mohon segera hubungi layanan gawat darurat atau ke IGD terdekat sekarang.",
    };
  }

  // "apakah kamu bisa membantu…", "kamu bisa apa" — a capability question,
  // not a health question.
  if (CAPABILITY_RE.test(t)) {
    return {
      ...base,
      evidence: [],
      insufficientEvidence: false,
      text: "Bisa. Saya membantu Anda menceritakan keluhan secara terstruktur, memberi informasi kesehatan berbasis literatur, lalu menyusun ringkasan yang bisa dibawa ke dokter. Silakan mulai — apa yang Anda rasakan?",
    };
  }

  if (intent === "NON_MEDICAL") {
    return {
      ...base,
      evidence: [],
      insufficientEvidence: false,
      text: "Baik. Silakan ceritakan keluhan kesehatan Anda, atau tanyakan hal yang ingin Anda ketahui.",
    };
  }

  if (intent === "MEDICATION_QUESTION") {
    return {
      ...base,
      evidence: [],
      insufficientEvidence: false,
      text: "Saya catat informasi obat itu. Setelah Anda menerima resep dari dokter, unggah fotonya di halaman Resep agar saya bisa bantu menjelaskan dosis dan aturan pakainya.",
    };
  }

  const needsEvidence =
    intent === "MEDICAL_INFORMATION_REQUEST" || intent === "SYMPTOM_DESCRIPTION";

  if (!needsEvidence) {
    return {
      ...base,
      evidence: [],
      insufficientEvidence: false,
      text: "Baik, saya catat. Boleh ceritakan lebih detail — sejak kapan, seberapa sering, dan apakah ada gejala lain yang menyertai?",
    };
  }

  const query = `${healthContext.chief_complaint ?? ""} ${healthContext.symptoms.join(" ")} ${utterance}`;
  const evidence = searchEvidence(query);

  // Persistent symptoms — override the generic "acute" framing.
  if (isChronic(healthContext.duration)) {
    return {
      ...base,
      evidence,
      insufficientEvidence: false,
      text: `Keluhan yang sudah berlangsung ${healthContext.duration} termasuk menetap dan sudah melewati rentang pemulihan yang biasa. Kondisi seperti ini sebaiknya diperiksakan langsung ke dokter untuk pemeriksaan fisik dan penunjang — terlebih bila disertai penurunan berat badan, demam berulang, sesak, atau dahak berdarah. Ini bukan diagnosis.`,
    };
  }

  if (evidence.length === 0) {
    return {
      ...base,
      evidence: [],
      insufficientEvidence: true,
      text: "Saya belum menemukan referensi yang cukup untuk menjawab itu dengan yakin. Boleh ceritakan gejala lain, sejak kapan, atau seberapa mengganggu?",
    };
  }

  // Don't re-serve a reference we already cited — move the conversation on.
  const alreadyCited = evidence.some((e) => lastAssistantText.includes(e.source.title));
  if (alreadyCited) {
    const nextAsk = !healthContext.duration
      ? "sejak kapan keluhan ini muncul?"
      : healthContext.associated_symptoms.length === 0
        ? "apakah ada gejala lain yang menyertai, misalnya demam, sesak, atau nyeri?"
        : "apakah keluhannya cenderung membaik, menetap, atau memburuk?";
    return {
      ...base,
      evidence: [],
      insufficientEvidence: false,
      text: `Poin itu sudah tercakup di referensi yang saya sampaikan sebelumnya. Untuk menilai lebih lanjut — ${nextAsk}`,
    };
  }

  const ask = !healthContext.duration ? " Sejak kapan keluhan ini berlangsung?" : "";
  return {
    ...base,
    evidence,
    insufficientEvidence: false,
    text: `${evidence[0].snippet} (${evidence[0].source.title}). Ini informasi umum, bukan diagnosis — bila ragu, tetap periksakan ke tenaga kesehatan.${ask}`,
  };
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
