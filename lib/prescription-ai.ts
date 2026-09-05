import { field, genId, type MedicationInfo, type PrescriptionItem } from "./types";
import { lookupMedication } from "./kb";

/**
 * Prescription-side helpers that don't need OCR itself (that part is real
 * now — see lib/ocr-client.ts): image quality gating (Section 35), the
 * NEEDS_VERIFICATION check (Section 38), a plain rule-based parser used as
 * the fallback when the LLM parse route is unavailable, and medication info
 * lookup against the local drug KB (Section 40-41).
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

/** Rule-based extraction of one PrescriptionItem from raw OCR text — the
 * fallback for app/api/prescription/parse when OpenAI is unavailable.
 * Deliberately conservative: low confidences so the verify screen flags
 * everything. */
export function parsePrescriptionText(rawText: string): PrescriptionItem[] {
  const text = rawText || "";
  const firstLine =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 2) ?? "";

  const strength = text.match(/(\d+(?:[.,]\d+)?)\s?(mg|mcg|ml|g|iu|%)\b/i);
  const freq =
    text.match(/(\d)\s?[x×]\s?(\d)/i) ??
    text.match(/(\d)\s?[x×]\s?(?:sehari|hari)/i) ??
    text.match(/(sekali|dua kali|tiga kali)\s+sehari/i);
  const qty = text.match(/(\d+)\s?(tablet|kapsul|kaplet|botol|strip|sachet)/i);
  const instruction = /sebelum\s+makan/i.test(text)
    ? "Sebelum makan"
    : /(sesudah|setelah)\s+makan/i.test(text)
      ? "Sesudah makan"
      : "Tidak terbaca";

  return [
    {
      id: genId("rx"),
      medicine_name: field(firstLine || "Tidak terbaca", firstLine ? 0.45 : 0.2),
      strength: field(strength ? `${strength[1]} ${strength[2]}` : "Tidak terbaca", strength ? 0.5 : 0.2),
      frequency: field(
        freq ? (freq[2] && /^\d$/.test(freq[2]) ? `${freq[1]}x${freq[2]}` : freq[0]) : "Tidak terbaca",
        freq ? 0.5 : 0.2
      ),
      quantity: field(qty ? `${qty[1]} ${qty[2]}` : "Tidak terbaca", qty ? 0.5 : 0.2),
      route: field("Oral", 0.4),
      instruction: field(instruction, instruction === "Tidak terbaca" ? 0.2 : 0.5),
    },
  ];
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
