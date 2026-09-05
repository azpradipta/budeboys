import { createWorker } from "tesseract.js";

// Transkripsi foto resep di browser, jadi gambarnya tidak keluar dari perangkat.
// Hanya teksnya yang dikirim ke server untuk dipecah jadi field oleh LLM.
export async function recognizeRawText(file: File): Promise<string> {
  const worker = await createWorker(["eng", "ind"]);
  try {
    const { data } = await worker.recognize(file, {}, { text: true });
    return (data.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
