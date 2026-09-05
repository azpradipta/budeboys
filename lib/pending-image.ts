/**
 * Transient, in-memory-only hand-off of a raw prescription image from the
 * upload control (Phase 3, inside a consultation) to the OCR step on
 * `/prescriptions/[id]`. Deliberately NOT persisted anywhere (no
 * localStorage, no server) — the image is only ever processed client-side
 * and is discarded the moment OCR consumes it or the tab is closed/reloaded.
 *
 * A plain module-level Map survives a Next.js client-side navigation
 * (`router.push`) because that's just a React re-render, not a page
 * reload — it does NOT survive a hard refresh, which is intentional: if the
 * image is gone, the user must re-upload it (nothing was silently retried
 * against a stale/missing image).
 */

const pendingImages = new Map<string, File>();

export function stashPendingImage(id: string, file: File) {
  pendingImages.set(id, file);
}

/** Consumes (removes) the pending image for this id, if any. */
export function takePendingImage(id: string): File | undefined {
  const file = pendingImages.get(id);
  pendingImages.delete(id);
  return file;
}
