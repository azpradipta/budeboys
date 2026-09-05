import type { MedicationInfo, PrescriptionItem } from "./types";
import { lookupMedication } from "./kb";

/**
 * Prescription-side helpers that don't need OCR itself (that part is real
 * now — see lib/ocr-client.ts): image quality gating (Section 35), the
 * NEEDS_VERIFICATION check (Section 38), and medication info lookup
 * against the local drug KB (Section 40-41).
 */

export function checkImageQuality(file: File): { ok: boolean; reason?: string } {
  if (file.size < 8_000) {
    return { ok: false, reason: "Resolusi gambar terlalu rendah / file terlalu kecil." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "Berkas bukan gambar yang didukung." };
  }
  return { ok: true };
}

export function needsVerification(items: PrescriptionItem[]): boolean {
  return items.some((item) =>
    Object.values(item).some(
      (v) => typeof v === "object" && v !== null && "needsVerification" in v && v.needsVerification && !v.verified
    )
  );
}

export function getMedicationInfo(item: PrescriptionItem): MedicationInfo {
  const drug = lookupMedication(item.medicine_name.value);
  if (!drug) {
    return {
      medicine_name: item.medicine_name.value,
      general_use: "Informasi obat tidak ditemukan pada basis pengetahuan.",
      dosage_as_written: item.strength.value,
      frequency_as_written: item.frequency.value,
      route: item.route.value,
      prescription_instruction: item.instruction.value,
      important_general_information: [
        "MEDICATION_MATCH_FAILED — konfirmasikan nama obat ini langsung ke apoteker/dokter.",
      ],
      matched: false,
    };
  }
  return {
    ...drug,
    dosage_as_written: item.strength.value,
    frequency_as_written: item.frequency.value,
    matched: true,
  };
}
