import type { ConsultationSession } from "./types";

export type ConditionKind = "diagnosis" | "complaint" | "unknown";

export interface Condition {
  label: string;
  kind: ConditionKind;
}

/** The best available "what is this consultation about" label:
 * doctor's diagnosis if validated, else the chief complaint, else nothing. */
export function conditionOf(session: ConsultationSession | null | undefined): Condition {
  const dx = session?.doctorValidation?.diagnosis?.trim();
  if (dx) return { label: dx, kind: "diagnosis" };

  const cc = (
    session?.summary?.chief_complaint ??
    session?.healthContext.chief_complaint ??
    ""
  ).trim();
  if (cc && !/tidak disebutkan|unknown/i.test(cc)) {
    return { label: cc, kind: "complaint" };
  }

  return { label: "Kondisi belum terklasifikasi", kind: "unknown" };
}

export const CONDITION_KIND_LABEL: Record<ConditionKind, string> = {
  diagnosis: "Diagnosa dokter",
  complaint: "Pra-diagnosa sistem",
  unknown: "Belum terklasifikasi",
};

/** The AI preliminary assessment paragraph, or null when it carries no real
 * information. */
export function assessmentOf(session: ConsultationSession | null | undefined): string | null {
  const a = session?.summary?.ai_preliminary_assessment?.trim();
  if (!a) return null;
  if (/informasi belum cukup untuk memberikan penilaian/i.test(a)) return null;
  return a;
}
