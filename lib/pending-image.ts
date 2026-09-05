/**
 * Mengoper gambar resep dari tombol unggah ke tahap OCR di
 * `/prescriptions/[id]`, murni di memori. Tidak ditulis ke localStorage,
 * tidak dikirim ke server, dan dibuang begitu OCR mengambilnya.
 *
 * Map di level modul bertahan melewati `router.push`, tapi tidak melewati
 * hard refresh. Itu disengaja: pengguna mengunggah ulang, bukan aplikasi
 * diam-diam memproses gambar yang sudah hilang.
 */

const pendingImages = new Map<string, File>();

export function stashPendingImage(id: string, file: File) {
  pendingImages.set(id, file);
}

/** Mengambil sekaligus menghapus gambar tertunda untuk id ini. */
export function takePendingImage(id: string): File | undefined {
  const file = pendingImages.get(id);
  pendingImages.delete(id);
  return file;
}
