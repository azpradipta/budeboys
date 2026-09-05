import { field, genId, type MedicationInfo, type PrescriptionItem } from "./types";
import { lookupMedication } from "./kb";

/**
 * Local stand-in for the Prescription Engine's OCR + structuring pipeline
 * (docs/prd.md Section 34-41). A real implementation would send the image to
 * an OCR/vision service; here we deterministically fabricate a plausible
 * PrescriptionItem so the verification + medication-info UI is fully
 * demoable without a backend.
 */

const SAMPLE_ITEMS: Omit<PrescriptionItem, "id">[] = [
  {
    medicine_name: field("Amoxicillin", 0.97),
    strength: field("500 mg", 0.94),
    frequency: field("3x sehari", 0.88),
    quantity: field("15 tablet", 0.82),
    route: field("Oral", 0.9),
    instruction: field("Sesudah makan", 0.61),
  },
  {
    medicine_name: field("Paracetamol", 0.96),
    strength: field("500 mg", 0.93),
    frequency: field("3x sehari bila perlu", 0.79),
    quantity: field("10 tablet", 0.85),
    route: field("Oral", 0.91),
    instruction: field("Sesudah makan bila demam/nyeri", 0.7),
  },
  {
    medicine_name: field("Cetirizine", 0.95),
    strength: field("10 mg", 0.9),
    frequency: field("1x sehari", 0.92),
    quantity: field("7 tablet", 0.88),
    route: field("Oral", 0.9),
    instruction: field("Malam hari sebelum tidur", 0.66),
  },
];

export function checkImageQuality(file: File): { ok: boolean; reason?: string } {
  if (file.size < 8_000) {
    return { ok: false, reason: "Resolusi gambar terlalu rendah / file terlalu kecil." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "Berkas bukan gambar yang didukung." };
  }
  return { ok: true };
}

/** Deterministic pick so the same filename always OCRs to the same demo item
 * within a session — feels stable across re-renders, not just random noise. */
function pickSample(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SAMPLE_ITEMS[hash % SAMPLE_ITEMS.length];
}

export function runOcr(fileName: string): PrescriptionItem[] {
  const base = pickSample(fileName || "resep");
  return [{ id: genId("rx"), ...base }];
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
