import { createWorker } from "tesseract.js";

/**
 * Membaca foto resep di browser lewat Tesseract (WASM), jadi gambarnya tidak
 * pernah keluar dari perangkat. Hanya teks hasilnya yang dikirim ke server
 * untuk dipecah jadi field oleh LLM.
 *
 * Tesseract sengaja hanya diminta melakukan transkripsi. Preprocessing canvas
 * dan ekstraksi field berbasis regex sebelumnya justru menurunkan akurasi.
 */
export async function recognizeRawText(file: File): Promise<string> {
  const worker = await createWorker(["eng", "ind"]);
  try {
    const { data } = await worker.recognize(file, {}, { text: true });
    return (data.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
