// Tipe domain yang dipakai bersama oleh klien, route API, dan spec OpenAPI.

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
  // Skor relevansi internal, tidak untuk ditampilkan mentah ke pengguna.
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
  // Cara kerja obat dalam bahasa awam, boleh kosong.
  how_it_works?: string;
  dosage_as_written: string;
  frequency_as_written: string;
  route: string;
  prescription_instruction: string;
  important_general_information: string[];
  matched: boolean;
  // Asal penjelasan ini.
  source?: "openai" | "local_kb" | "unmatched";
}

export type PrescriptionStatus =
  | "UPLOADED"
  | "IMAGE_QUALITY_FAILED"
  | "PROCESSING"
  | "TEXT_REVIEW"
  | "NEEDS_VERIFICATION"
  | "VERIFIED"
  | "COMPLETED";

export interface PrescriptionRecord {
  id: string;
  // Resep selalu dibuat dari dalam konsultasi, bukan unggahan lepas.
  consultationId: string;
  status: PrescriptionStatus;
  // Hanya terisi di browser, selalu null pada record dari API.
  imageDataUrl: string | null;
  fileName: string;
  createdAt: string;
  // Teks mentah OCR, bisa dikoreksi pengguna sebelum di-parse.
  rawText?: string;
  items: PrescriptionItem[];
  medications: MedicationInfo[];
}

// Yang benar-benar disimpan server: semuanya kecuali preview gambar.
export type StoredPrescriptionRecord = Omit<PrescriptionRecord, "imageDataUrl">;

export function genId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
