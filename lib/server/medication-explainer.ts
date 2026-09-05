import type { MedicationInfo } from "@/lib/types";

// Penjelasan obat setelah resep diverifikasi: kegunaan umum saja, tanpa saran dosis.
// Mengembalikan null bila gagal agar pemanggil fallback ke drug KB lokal.

const BASE_URL = "https://api.openai.com/v1";

function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SYSTEM_PROMPT = `Anda menjelaskan informasi UMUM tentang obat kepada pasien awam berbahasa Indonesia, untuk fitur "pemahaman resep", BUKAN untuk meresepkan.

ATURAN KETAT (keselamatan medis):
- Hanya informasi umum yang berlaku luas untuk obat/golongan tersebut. JANGAN mengklaim obat ini pasti cocok, aman, atau efektif untuk kondisi pengguna.
- JANGAN memberi atau menilai dosis. JANGAN menyarankan mengganti, menambah, atau menghentikan obat. Dosis dan aturan pakai yang berlaku adalah yang ditulis dokter.
- JANGAN mendiagnosis. JANGAN menjanjikan hasil ("pasti sembuh", "ampuh"). Gunakan bahasa netral ("umumnya digunakan untuk...", "dapat membantu...").
- Jika nama obat tidak Anda kenali sebagai obat nyata, set "recognized": false dan jangan menebak isinya.
- Ringkas, jelas, Bahasa Indonesia.

Jawab HANYA dengan objek JSON:
{
  "recognized": boolean,
  "general_use": string,
  "how_it_works": string,
  "important_general_information": string[]
}
- general_use: 1-3 kalimat, untuk apa obat/golongan ini umumnya dipakai.
- how_it_works: 1-2 kalimat cara kerja untuk awam; "" jika tidak yakin.
- important_general_information: 2-5 poin umum (efek samping yang sering, hal yang perlu diperhatikan, kapan sebaiknya menghubungi dokter/apoteker). Tanpa angka dosis.`;

interface RawExplain {
  recognized?: boolean;
  general_use?: string;
  how_it_works?: string;
  important_general_information?: string[];
}

export async function explainMedication(input: {
  name: string;
  strength: string;
  frequency: string;
  route: string;
  instruction: string;
}): Promise<MedicationInfo | null> {
  if (!isConfigured()) {
    console.warn("[openai] OPENAI_API_KEY not set, medication explanation uses local KB fallback.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const written = {
    dosage_as_written: input.strength,
    frequency_as_written: input.frequency,
    route: input.route,
    prescription_instruction: input.instruction,
  };

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Obat: ${input.name}. Yang tertulis di resep, kekuatan: ${input.strength}, frekuensi: ${input.frequency}, rute: ${input.route}, aturan pakai: ${input.instruction}. Jelaskan informasi umum obat ini.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[openai] medication explain ${res.status} ${res.statusText}, using local KB fallback. ${detail.slice(0, 300)}`
      );
      return null;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as RawExplain;

    if (parsed.recognized === false) {
      return {
        medicine_name: input.name,
        general_use:
          "Nama obat ini tidak dikenali secara pasti. Konfirmasikan langsung ke apoteker atau dokter yang meresepkan.",
        how_it_works: "",
        ...written,
        important_general_information: [
          "MEDICATION_MATCH_FAILED: pastikan nama obat sudah benar dari hasil verifikasi.",
        ],
        matched: false,
        source: "unmatched",
      };
    }

    return {
      medicine_name: input.name,
      general_use: parsed.general_use?.trim() || "Informasi umum tidak tersedia.",
      how_it_works: parsed.how_it_works?.trim() || "",
      ...written,
      important_general_information: [
        ...(parsed.important_general_information ?? []).map((s) => s.trim()).filter(Boolean),
        "Informasi ini bersifat umum, bukan pengganti nasihat dokter atau apoteker.",
      ],
      matched: true,
      source: "openai",
    };
  } catch (err) {
    console.warn(
      `[openai] medication explain failed (${
        err instanceof Error ? err.message : String(err)
      }), using local KB fallback.`
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
