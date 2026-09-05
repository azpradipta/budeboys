import { field, genId, type PrescriptionItem } from "@/lib/types";

// Mengubah teks OCR jadi item resep terstruktur, termasuk singkatan Latin resep.
// Hanya teksnya yang dikirim, dan null dikembalikan bila gagal agar bisa fallback.

const BASE_URL = "https://api.openai.com/v1";

function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_PROMPT = `Anda mengekstrak isi resep dokter Indonesia dari teks hasil OCR yang sering berantakan (typo, huruf hilang, singkatan Latin).

Kenali pola resep: "R/" menandai satu obat; "S" atau "s" = signa (aturan pakai); "a.c" = sebelum makan; "p.c"/"d.c" = sesudah/saat makan; "dd" atau "d.d" = per hari; "no." atau "No." = jumlah; angka pola "1-0-1" = pagi-siang-malam; "prn"/"k/p" = bila perlu.

ATURAN:
- Ekstrak HANYA yang ada di teks. Jangan mengarang. Kalau sebuah field tidak terbaca, isi "Tidak terbaca" dan confidence rendah.
- Boleh ada lebih dari satu obat.
- Jangan menilai atau mengoreksi dosis dokter, salin apa adanya.
- Bahasa Indonesia untuk label rute & aturan pakai (mis. "Oral", "Sublingual", "Sebelum makan", "3x1").

Jawab HANYA JSON:
{
  "items": [
    {
      "medicine_name": { "value": string, "confidence": number },
      "strength":      { "value": string, "confidence": number },
      "frequency":     { "value": string, "confidence": number },
      "quantity":      { "value": string, "confidence": number },
      "route":         { "value": string, "confidence": number },
      "instruction":   { "value": string, "confidence": number }
    }
  ]
}
confidence = 0..1 seberapa yakin Anda field itu benar terbaca.`;

interface RawField {
  value?: string;
  confidence?: number;
}
interface RawItem {
  medicine_name?: RawField;
  strength?: RawField;
  frequency?: RawField;
  quantity?: RawField;
  route?: RawField;
  instruction?: RawField;
}

function toField(raw: RawField | undefined, fallbackValue = "Tidak terbaca"): ReturnType<typeof field<string>> {
  const value = raw?.value?.trim() || fallbackValue;
  const confidence =
    typeof raw?.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.4;
  return field(value, confidence);
}

export async function parsePrescriptionWithLLM(
  rawText: string
): Promise<PrescriptionItem[] | null> {
  if (!isConfigured()) {
    console.warn("[openai] OPENAI_API_KEY not set, prescription parse uses rule-based fallback.");
    return null;
  }
  if (!rawText.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Teks OCR resep:\n"""\n${rawText}\n"""` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[openai] prescription parse ${res.status} ${res.statusText}, using rule-based fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { items?: RawItem[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    if (items.length === 0) return [];

    return items.map((it) => ({
      id: genId("rx"),
      medicine_name: toField(it.medicine_name),
      strength: toField(it.strength),
      frequency: toField(it.frequency),
      quantity: toField(it.quantity),
      route: toField(it.route, "Oral"),
      instruction: toField(it.instruction),
    }));
  } catch (err) {
    console.warn(
      `[openai] prescription parse failed (${
        err instanceof Error ? err.message : String(err)
      }), using rule-based fallback.`
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
