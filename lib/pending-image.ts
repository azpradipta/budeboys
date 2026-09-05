// Mengoper gambar resep ke tahap OCR lewat memori saja, tidak ke server.
// Hilang saat hard refresh, jadi pengguna mengunggah ulang.

const pendingImages = new Map<string, File>();

export function stashPendingImage(id: string, file: File) {
  pendingImages.set(id, file);
}

// Mengambil sekaligus menghapus gambar tertunda untuk id ini.
export function takePendingImage(id: string): File | undefined {
  const file = pendingImages.get(id);
  pendingImages.delete(id);
  return file;
}
