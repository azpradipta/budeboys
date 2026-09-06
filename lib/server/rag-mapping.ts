import type {
  EvidenceReference,
  EvidenceSource,
  HealthContext,
  RiskLevel,
  Severity,
  SourceType,
  UtteranceIntent,
} from "@/lib/types";
import type {
  RagEvidence,
  RagHealthContext,
  RagQueryResult,
  RagSafetyFlag,
  RagSummary,
  RagSummaryField,
} from "./rag-client";

// Adapter response RAG ke tipe aplikasi. Satu-satunya file yang
// perlu disesuaikan kalau bentuk response mereka berubah.

const VALID_SOURCE_TYPES: SourceType[] = [
  "journal",
  "systematic_review",
  "clinical_guideline",
  "authoritative_health_source",
];

function toSourceType(raw: string): SourceType {
  return (VALID_SOURCE_TYPES as string[]).includes(raw)
    ? (raw as SourceType)
    : "authoritative_health_source";
}

export function mapRagEvidence(items: RagEvidence[]): EvidenceReference[] {
  return items.map((e) => {
    const source: EvidenceSource = {
      source_id: e.source_id,
      title: e.title,
      authors: "", // RAG tidak mengirimnya; EvidenceList sembunyikan saat kosong
      publication_year: e.published_year ?? new Date().getFullYear(),
      publisher: e.publisher ?? "Unknown",
      doi: e.doi ?? "",
      abstract: e.snippet,
      url: e.url ?? "", // null berarti RAG gagal memverifikasi tautannya
      source_type: toSourceType(e.source_type),
    };
    return { source, snippet: e.snippet, score: e.relevance };
  });
}

function toSeverity(raw: string | null): Severity {
  if (!raw) return "unknown";
  const t = raw.toLowerCase();
  if (/(ringan|mild)/.test(t)) return "mild";
  if (/(sedang|moderate)/.test(t)) return "moderate";
  if (/(berat|parah|severe)/.test(t)) return "severe";
  return "unknown";
}

// Menggabungkan konteks RAG ke milik kita, tanpa mengarang field yang tidak ada di sana.
export function mapRagContext(
  hc: RagHealthContext,
  previous: HealthContext
): HealthContext {
  return {
    chief_complaint: hc.chief_complaint ?? previous.chief_complaint,
    symptoms: hc.symptoms.length > 0 ? hc.symptoms : previous.symptoms,
    duration: hc.duration ?? previous.duration,
    severity: toSeverity(hc.severity),
    onset: hc.onset ?? previous.onset,
    progression: hc.progression ?? previous.progression,
    associated_symptoms:
      hc.associated_symptoms.length > 0 ? hc.associated_symptoms : previous.associated_symptoms,
    reported_conditions: previous.reported_conditions,
    medication_information:
      hc.medications.length > 0 ? hc.medications : previous.medication_information,
    allergy_information: hc.allergies.length > 0 ? hc.allergies : previous.allergy_information,
    relevant_history:
      hc.relevant_history.length > 0 ? hc.relevant_history : previous.relevant_history,
    user_questions: previous.user_questions,
  };
}

export function toRagContext(hc: HealthContext): Partial<RagHealthContext> {
  return {
    chief_complaint: hc.chief_complaint,
    symptoms: hc.symptoms,
    duration: hc.duration,
    severity: hc.severity === "unknown" ? null : hc.severity,
    onset: hc.onset,
    progression: hc.progression,
    associated_symptoms: hc.associated_symptoms,
    medications: hc.medication_information,
    allergies: hc.allergy_information,
    relevant_history: hc.relevant_history,
  };
}

const INTENT_MAP: Record<string, UtteranceIntent> = {
  CLAIM_VERIFICATION: "MEDICAL_INFORMATION_REQUEST",
  HEALTH_INFORMATION: "MEDICAL_INFORMATION_REQUEST",
  SYMPTOM_CONTEXT: "SYMPTOM_DESCRIPTION",
  FOLLOW_UP: "FOLLOW_UP_QUESTION",
  MEDICATION_INFORMATION: "MEDICATION_QUESTION",
  GENERAL_HEALTH: "MEDICAL_INFORMATION_REQUEST",
  UNSUPPORTED: "NON_MEDICAL",
};

export function mapRagIntent(raw: string): UtteranceIntent {
  return INTENT_MAP[raw] ?? "NON_MEDICAL";
}

export function mapRagRisk(safety: RagQueryResult["safety"]): RiskLevel {
  const flags: RagSafetyFlag[] = safety?.flags ?? [];
  if (flags.some((f) => f.code === "EMERGENCY_SIGNAL")) return "EMERGENCY_SIGNAL";
  if (flags.some((f) => f.severity === "critical")) return "HIGH_RISK";
  if (flags.some((f) => f.severity === "warning")) return "MEDIUM_RISK";
  return "LOW_RISK";
}

function pickValue<T>(field: RagSummaryField<T> | null | undefined, fallback: T): T {
  return field?.value ?? fallback;
}

// Memetakan summary RAG ke ConsultationSummary, tanpa provenance per field.
export function mapRagSummary(summary: RagSummary) {
  return {
    chief_complaint: pickValue(summary.chief_complaint, "Tidak disebutkan secara eksplisit"),
    reported_symptoms: summary.symptoms
      .map((s) => pickValue<string>(s, ""))
      .filter(Boolean),
    duration_onset: pickValue(summary.duration, "unknown"),
    relevant_information: summary.relevant_information
      .map((i) => pickValue<string>(i, ""))
      .filter(Boolean),
    questions_discussed: [] as string[], // tidak ada padanannya di RAG
    ai_preliminary_assessment: pickValue(
      summary.preliminary_assessment,
      "Informasi belum cukup untuk memberikan penilaian awal."
    ),
    evidence_discussed: summary.evidence_discussed.map(
      (e): EvidenceReference => ({
        source: {
          source_id: e.doi ?? e.title,
          title: e.title,
          authors: "",
          publication_year: new Date().getFullYear(),
          publisher: "",
          doi: e.doi ?? "",
          abstract: "",
          url: "", // url tervalidasi hanya ada di /query, dan doi.org tidak boleh dikarang
          source_type: "journal" as const,
        },
        snippet: "",
        score: 1,
      })
    ),
    recommended_next_step:
      summary.recommended_next_step
        .map((s) => pickValue<string>(s, ""))
        .filter(Boolean)
        .join(" ") ||
      "Jadwalkan konsultasi dengan dokter untuk pemeriksaan dan diagnosis lebih lanjut.",
    important_warnings: summary.safety_notes.map((s) => pickValue<string>(s, "")).filter(Boolean),
    generated_at: new Date().toISOString(),
  };
}
