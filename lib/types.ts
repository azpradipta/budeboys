// Domain types for Healthalk, modeled after docs/prd.md
// (Section 10 HealthContext, Section 16 Evidence, Section 26 Summary,
//  Section 36-40 Prescription, Section 56 Minimum Data Entities)

export type Severity = "mild" | "moderate" | "severe" | "unknown";

export interface HealthContext {
  chief_complaint: string | null;
  symptoms: string[];
  duration: string | null;
  severity: Severity;
  onset: string | null;
  progression: string | null;
  associated_symptoms: string[];
  reported_conditions: string[];
  medication_information: string[];
  allergy_information: string[];
  relevant_history: string[];
  user_questions: string[];
}

export function emptyHealthContext(): HealthContext {
  return {
    chief_complaint: null,
    symptoms: [],
    duration: null,
    severity: "unknown",
    onset: null,
    progression: null,
    associated_symptoms: [],
    reported_conditions: [],
    medication_information: [],
    allergy_information: [],
    relevant_history: [],
    user_questions: [],
  };
}

export type MessageRole = "user" | "assistant";

export type UtteranceIntent =
  | "SYMPTOM_DESCRIPTION"
  | "MEDICAL_INFORMATION_REQUEST"
  | "FOLLOW_UP_QUESTION"
  | "CLARIFICATION"
  | "MEDICATION_QUESTION"
  | "PREVIOUS_CONTEXT_REFERENCE"
  | "NON_MEDICAL"
  | "EMERGENCY_SIGNAL";

export type SourceType =
  | "journal"
  | "systematic_review"
  | "clinical_guideline"
  | "authoritative_health_source";

/** Evidence source metadata (Section 16). Demo KB is local & clearly labeled
 * as illustrative — it stands in for a real evidence-retrieval backend. */
export interface EvidenceSource {
  source_id: string;
  title: string;
  authors: string;
  publication_year: number;
  publisher: string;
  doi: string;
  abstract: string;
  url: string;
  source_type: SourceType;
}

export interface EvidenceReference {
  source: EvidenceSource;
  snippet: string;
  /** internal score, PRD 19: "tidak harus ditampilkan ke user" as raw number */
  score: number;
}

export type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "EMERGENCY_SIGNAL";

export interface ConsultationMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  intent?: UtteranceIntent;
  evidence?: EvidenceReference[];
  risk?: RiskLevel;
  insufficientEvidence?: boolean;
}

export type ConsultationStatus =
  | "ACTIVE"
  | "COMPLETING"
  | "SUMMARY_GENERATION"
  | "SECURITY_PROCESSING"
  | "COMPLETED";

export interface ConsultationSummary {
  chief_complaint: string;
  reported_symptoms: string[];
  duration_onset: string;
  relevant_information: string[];
  questions_discussed: string[];
  ai_preliminary_assessment: string;
  evidence_discussed: EvidenceReference[];
  recommended_next_step: string;
  important_warnings: string[];
  generated_at: string;
}

export interface DoctorValidation {
  confirmed_information: string[];
  corrected_information: string[];
  additional_notes: string;
  diagnosis: string;
  treatment: string;
  source: "DOCTOR";
  recorded_at: string;
}

export interface ConsultationSession {
  id: string;
  status: ConsultationStatus;
  createdAt: string;
  completedAt?: string;
  messages: ConsultationMessage[];
  healthContext: HealthContext;
  summary?: ConsultationSummary;
  doctorValidation?: DoctorValidation;
  encrypted: boolean;
}

// ---- Prescription domain ----

export interface FieldConfidence<T> {
  value: T;
  confidence: number; // 0..1
  needsVerification: boolean;
  verified: boolean;
}

export function field<T>(value: T, confidence: number): FieldConfidence<T> {
  return { value, confidence, needsVerification: confidence < 0.8, verified: false };
}

export interface PrescriptionItem {
  id: string;
  medicine_name: FieldConfidence<string>;
  strength: FieldConfidence<string>;
  frequency: FieldConfidence<string>;
  quantity: FieldConfidence<string>;
  route: FieldConfidence<string>;
  instruction: FieldConfidence<string>;
  refill_instruction?: FieldConfidence<string>;
}

export interface MedicationInfo {
  medicine_name: string;
  general_use: string;
  /** Brief lay explanation of how it works. May be empty. */
  how_it_works?: string;
  dosage_as_written: string;
  frequency_as_written: string;
  route: string;
  prescription_instruction: string;
  important_general_information: string[];
  matched: boolean;
  /** Where the explanation came from. */
  source?: "openai" | "local_kb" | "unmatched";
}

export type PrescriptionStatus =
  | "UPLOADED"
  | "IMAGE_QUALITY_FAILED"
  | "PROCESSING"
  | "NEEDS_VERIFICATION"
  | "VERIFIED"
  | "COMPLETED";

export interface PrescriptionRecord {
  id: string;
  /** Links this prescription to the consultation it was uploaded from —
   * prescriptions can only be created from within a consultation's Phase 3,
   * never as a standalone upload. */
  consultationId: string;
  status: PrescriptionStatus;
  /** Client-side only — the raw image is processed locally for OCR and is
   * never sent to or persisted by the server. Always null once this record
   * comes back from the API. */
  imageDataUrl: string | null;
  fileName: string;
  createdAt: string;
  items: PrescriptionItem[];
  medications: MedicationInfo[];
}

/** Shape actually persisted server-side — same as PrescriptionRecord minus
 * the client-only image preview. */
export type StoredPrescriptionRecord = Omit<PrescriptionRecord, "imageDataUrl">;

export function genId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
