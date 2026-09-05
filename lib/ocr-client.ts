import { createWorker } from "tesseract.js";
import { DRUG_KB } from "./kb";
import { field, genId, type PrescriptionItem } from "./types";

/**
 * Client-side OCR for prescription images (docs/prd.md Section 34-38). Runs
 * entirely in the browser via Tesseract.js (WASM) — the image bytes never
 * leave the client. Field confidence comes from Tesseract's own per-word
 * confidence scores.
 *
 * Kept deliberately simple: Tesseract's own image handling and default page
 * segmentation read real photos better than hand-rolled canvas
 * preprocessing did. The structured-field extraction is a light heuristic —
 * whatever it gets wrong, the user fixes on the verification screen.
 */

interface OcrWord {
  text: string;
  confidence: number; // 0..1
}

interface OcrBlock {
  paragraphs: { lines: { words: { text: string; confidence: number }[] }[] }[];
}

function flattenWords(blocks: OcrBlock[] | null): OcrWord[] {
  if (!blocks) return [];
  const words: OcrWord[] = [];
  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({ text: word.text, confidence: word.confidence / 100 });
        }
      }
    }
  }
  return words;
}

async function recognizeText(file: File): Promise<{ text: string; words: OcrWord[] }> {
  const worker = await createWorker(["eng", "ind"]);
  try {
    const { data } = await worker.recognize(file, {}, { text: true, blocks: true });
    return {
      text: data.text ?? "",
      words: flattenWords((data.blocks as OcrBlock[] | null) ?? null),
    };
  } finally {
    await worker.terminate();
  }
}

/** Primary path: transcribe the (cropped) image to raw text and stop there.
 * Classifying that text into fields is left to the LLM (server-side, text
 * only) — Tesseract is only asked to do what it's good at. */
export async function recognizeRawText(file: File): Promise<string> {
  const { text } = await recognizeText(file);
  return text.trim();
}

/** Average confidence of the OCR words that make up a matched substring. */
function confidenceOf(words: OcrWord[], matchText: string): number {
  const tokens = matchText.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => tokens.some((t) => t.includes(w.text.toLowerCase())));
  if (hits.length === 0) return 0.4;
  return hits.reduce((sum, w) => sum + w.confidence, 0) / hits.length;
}

/** Common Indonesian drugs (generic + frequent brands) — a wider net than
 * the 5 entries in DRUG_KB for matching the medicine-name field. */
const DRUG_VOCAB = [
  ...Object.keys(DRUG_KB),
  "amoxicillin",
  "paracetamol",
  "sanmol",
  "panadol",
  "ibuprofen",
  "proris",
  "asam mefenamat",
  "mefinal",
  "natrium diklofenak",
  "cataflam",
  "cetirizine",
  "loratadine",
  "chlorpheniramine",
  "dexamethasone",
  "methylprednisolone",
  "prednison",
  "omeprazole",
  "lansoprazole",
  "ranitidine",
  "antasida",
  "sucralfate",
  "domperidone",
  "ondansetron",
  "amlodipine",
  "captopril",
  "candesartan",
  "bisoprolol",
  "simvastatin",
  "atorvastatin",
  "metformin",
  "glimepiride",
  "salbutamol",
  "ambroxol",
  "acetylcysteine",
  "guaifenesin",
  "dextromethorphan",
  "cefadroxil",
  "cefixime",
  "ciprofloxacin",
  "azithromycin",
  "metronidazole",
  "allopurinol",
];

const INSTRUCTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /sebelum\s+makan/i, label: "Sebelum makan" },
  { pattern: /sesudah\s+makan\s+malam/i, label: "Sesudah makan malam" },
  { pattern: /(sesudah|setelah)\s+makan/i, label: "Sesudah makan" },
  { pattern: /(saat|bersama)\s+makan/i, label: "Saat makan" },
  { pattern: /(sebelum\s+tidur|malam\s+hari)/i, label: "Malam hari sebelum tidur" },
];

const ROUTE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /tetes\s*mata/i, label: "Tetes mata" },
  { pattern: /tetes\s*telinga/i, label: "Tetes telinga" },
  { pattern: /(salep|krim|cream|gel|oles|topikal)/i, label: "Oles / topikal" },
  { pattern: /(suntik|injeksi)/i, label: "Injeksi" },
  { pattern: /(supp|suppositoria)/i, label: "Rektal (supositoria)" },
];

export async function recognizePrescription(file: File): Promise<PrescriptionItem[]> {
  const { text, words } = await recognizeText(file);
  const lower = text.toLowerCase();

  const vocabHit = DRUG_VOCAB.find((d) => lower.includes(d));
  const kbKey = vocabHit
    ? Object.keys(DRUG_KB).find((k) => vocabHit.includes(k) || k.includes(vocabHit))
    : undefined;
  const fallbackLine = text.split(/\r?\n/).find((l) => l.trim().length > 2)?.trim();
  const medicineName = kbKey
    ? DRUG_KB[kbKey].medicine_name
    : vocabHit
      ? vocabHit.replace(/\b\w/g, (c) => c.toUpperCase())
      : fallbackLine || "Tidak terbaca";
  const nameConfidence = vocabHit ? Math.max(0.7, confidenceOf(words, vocabHit)) : 0.3;

  const strengthMatch = text.match(/(\d+(?:[.,]\d+)?)\s?(mg|mcg|ml|g|iu|%)\b/i);
  const freqMatch =
    text.match(/(\d)\s?[x×]\s?(\d)/i) ??
    text.match(/(\d)\s?[x×]\s?(?:sehari|hari)/i) ??
    text.match(/(sekali|dua kali|tiga kali)\s+sehari/i);
  const qtyMatch = text.match(/(\d+)\s?(tablet|kapsul|kaplet|botol|strip|sachet)/i);
  const instructionHit = INSTRUCTION_PATTERNS.find((p) => p.pattern.test(text));
  const routeHit = ROUTE_PATTERNS.find((p) => p.pattern.test(text));

  return [
    {
      id: genId("rx"),
      medicine_name: field(medicineName, nameConfidence),
      strength: field(
        strengthMatch ? `${strengthMatch[1]} ${strengthMatch[2]}` : "Tidak terbaca",
        strengthMatch ? confidenceOf(words, strengthMatch[0]) : 0.3
      ),
      frequency: field(
        freqMatch
          ? freqMatch[2] && /^\d$/.test(freqMatch[2])
            ? `${freqMatch[1]}x${freqMatch[2]}`
            : /[x×]/i.test(freqMatch[0])
              ? `${freqMatch[1]}x sehari`
              : `${freqMatch[0]}`
          : "Tidak terbaca",
        freqMatch ? confidenceOf(words, freqMatch[0]) : 0.3
      ),
      quantity: field(
        qtyMatch ? `${qtyMatch[1]} ${qtyMatch[2]}` : "Tidak terbaca",
        qtyMatch ? confidenceOf(words, qtyMatch[0]) : 0.3
      ),
      route: field(routeHit?.label ?? "Oral", routeHit ? 0.8 : 0.55),
      instruction: field(instructionHit?.label ?? "Tidak terbaca", instructionHit ? 0.8 : 0.3),
    },
  ];
}
