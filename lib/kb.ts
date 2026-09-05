import type { EvidenceSource, MedicationInfo } from "./types";

/**
 * Knowledge base demo lokal, pengganti backend evidence retrieval dan drug
 * knowledge yang sebenarnya. Isinya ilustratif, bukan korpus riset asli, dan
 * UI wajib menandainya begitu agar tidak terkesan lebih pasti dari faktanya.
 */

const EVIDENCE_KB: (EvidenceSource & { keywords: string[] })[] = [
  {
    source_id: "demo-evid-001",
    title: "Panduan Umum: Demam pada Dewasa",
    authors: "Tim Health Intelligence (contoh)",
    publication_year: 2023,
    publisher: "Contoh Basis Pengetahuan Kesehatan",
    doi: "demo:fever-adult-001",
    abstract:
      "Ringkasan ilustratif mengenai demam pada dewasa: demam yang menetap lebih dari 3 hari, disertai gejala berat, atau pada kelompok risiko tinggi disarankan untuk diperiksakan ke tenaga kesehatan.",
    url: "https://www.who.int/",
    source_type: "clinical_guideline",
    keywords: ["demam", "fever", "panas", "menggigil"],
  },
  {
    source_id: "demo-evid-002",
    title: "Panduan Umum: Batuk Akut dan Kapan Perlu Diperiksa",
    authors: "Tim Health Intelligence (contoh)",
    publication_year: 2022,
    publisher: "Contoh Basis Pengetahuan Kesehatan",
    doi: "demo:cough-acute-002",
    abstract:
      "Batuk akut umumnya membaik dalam 1-3 minggu. Batuk yang disertai sesak napas berat, dahak berdarah, atau demam tinggi memerlukan evaluasi medis segera.",
    url: "https://www.who.int/",
    source_type: "clinical_guideline",
    keywords: ["batuk", "cough", "dahak", "sesak"],
  },
  {
    source_id: "demo-evid-003",
    title: "Ringkasan: Nyeri Perut pada Dewasa dan Red Flags",
    authors: "Tim Health Intelligence (contoh)",
    publication_year: 2021,
    publisher: "Contoh Basis Pengetahuan Kesehatan",
    doi: "demo:abdopain-003",
    abstract:
      "Nyeri perut yang tiba-tiba, sangat hebat, disertai demam tinggi, muntah darah, atau perut yang keras merupakan tanda bahaya (red flag) yang memerlukan penanganan segera.",
    url: "https://www.who.int/",
    source_type: "systematic_review",
    keywords: ["perut", "abdomen", "mual", "muntah", "nyeri perut"],
  },
  {
    source_id: "demo-evid-004",
    title: "Ringkasan: Sakit Kepala Primer vs Sekunder",
    authors: "Tim Health Intelligence (contoh)",
    publication_year: 2020,
    publisher: "Contoh Basis Pengetahuan Kesehatan",
    doi: "demo:headache-004",
    abstract:
      "Sebagian besar sakit kepala bersifat primer (tegang/migrain). Sakit kepala mendadak terberat seumur hidup, disertai gangguan penglihatan atau kesadaran, adalah tanda bahaya.",
    url: "https://www.who.int/",
    source_type: "journal",
    keywords: ["pusing", "kepala", "migrain", "headache"],
  },
  {
    source_id: "demo-evid-005",
    title: "Ringkasan: Reaksi Alergi dan Kapan Darurat",
    authors: "Tim Health Intelligence (contoh)",
    publication_year: 2023,
    publisher: "Contoh Basis Pengetahuan Kesehatan",
    doi: "demo:allergy-005",
    abstract:
      "Reaksi alergi ringan (gatal, ruam) dapat dipantau mandiri. Pembengkakan wajah/tenggorokan atau sesak napas setelah paparan alergen adalah kegawatdaruratan (anafilaksis).",
    url: "https://www.who.int/",
    source_type: "clinical_guideline",
    keywords: ["alergi", "gatal", "ruam", "bentol"],
  },
];

const EMERGENCY_KEYWORDS = [
  "tidak sadarkan diri",
  "pingsan",
  "sesak napas berat",
  "sulit bernapas",
  "nyeri dada hebat",
  "kejang",
  "muntah darah",
  "berdarah banyak",
  "bunuh diri",
];

export function detectEmergency(text: string): boolean {
  const t = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((k) => t.includes(k));
}

export function searchEvidence(query: string, limit = 2) {
  const q = query.toLowerCase();
  const scored = EVIDENCE_KB.map((entry) => {
    const hits = entry.keywords.filter((k) => q.includes(k)).length;
    return { entry, hits };
  }).filter((s) => s.hits > 0);

  scored.sort((a, b) => b.hits - a.hits);

  return scored.slice(0, limit).map(({ entry, hits }, idx) => ({
    source: {
      source_id: entry.source_id,
      title: entry.title,
      authors: entry.authors,
      publication_year: entry.publication_year,
      publisher: entry.publisher,
      doi: entry.doi,
      abstract: entry.abstract,
      url: entry.url,
      source_type: entry.source_type,
    },
    snippet: entry.abstract,
    score: Math.max(0.5, 0.95 - idx * 0.12 - (1 / (hits + 1)) * 0.1),
  }));
}

/** Local drug knowledge base (Section 41: must not rely on LLM memory alone). */
const DRUG_KB: Record<string, Omit<MedicationInfo, "dosage_as_written" | "frequency_as_written" | "matched">> = {
  amoxicillin: {
    medicine_name: "Amoxicillin",
    general_use:
      "Antibiotik golongan penisilin, umum digunakan untuk infeksi bakteri tertentu (mis. infeksi saluran napas, THT, saluran kemih).",
    route: "Oral",
    prescription_instruction: "Sesudah makan",
    important_general_information: [
      "Habiskan sesuai anjuran dokter meski gejala sudah membaik.",
      "Beri tahu dokter/apoteker bila memiliki riwayat alergi golongan penisilin.",
      "Informasi ini bersifat umum, bukan pengganti instruksi dokter yang meresepkan.",
    ],
  },
  paracetamol: {
    medicine_name: "Paracetamol",
    general_use: "Pereda nyeri dan penurun demam yang umum digunakan.",
    route: "Oral",
    prescription_instruction: "Dapat diminum sebelum/sesudah makan",
    important_general_information: [
      "Jangan melebihi dosis maksimal harian yang dianjurkan.",
      "Hati-hati penggunaan bersamaan dengan obat lain yang juga mengandung paracetamol.",
      "Informasi ini bersifat umum, bukan pengganti instruksi dokter yang meresepkan.",
    ],
  },
  ibuprofen: {
    medicine_name: "Ibuprofen",
    general_use: "Obat antiinflamasi nonsteroid (OAINS) untuk nyeri, demam, dan peradangan ringan-sedang.",
    route: "Oral",
    prescription_instruction: "Sesudah makan",
    important_general_information: [
      "Berpotensi mengiritasi lambung; sebaiknya diminum setelah makan.",
      "Perlu kehati-hatian pada riwayat gangguan lambung, ginjal, atau kehamilan.",
      "Informasi ini bersifat umum, bukan pengganti instruksi dokter yang meresepkan.",
    ],
  },
  cetirizine: {
    medicine_name: "Cetirizine",
    general_use: "Antihistamin untuk meredakan gejala alergi seperti gatal, bersin, dan ruam.",
    route: "Oral",
    prescription_instruction: "Sesudah makan malam",
    important_general_information: [
      "Dapat menyebabkan kantuk pada sebagian orang.",
      "Hindari aktivitas yang memerlukan kewaspadaan tinggi bila terasa mengantuk.",
      "Informasi ini bersifat umum, bukan pengganti instruksi dokter yang meresepkan.",
    ],
  },
  omeprazole: {
    medicine_name: "Omeprazole",
    general_use: "Menekan produksi asam lambung, umum untuk gejala asam lambung berlebih atau tukak lambung.",
    route: "Oral",
    prescription_instruction: "Sebelum makan (pagi hari)",
    important_general_information: [
      "Diminum sebelum makan agar bekerja optimal.",
      "Penggunaan jangka panjang sebaiknya dalam pengawasan dokter.",
      "Informasi ini bersifat umum, bukan pengganti instruksi dokter yang meresepkan.",
    ],
  },
};

export function lookupMedication(name: string) {
  const key = name.trim().toLowerCase();
  const hit = Object.entries(DRUG_KB).find(
    ([k]) => key.includes(k) || k.includes(key)
  );
  return hit ? hit[1] : null;
}
