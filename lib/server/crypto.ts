/**
 * Encryption seam for data-at-rest (docs/prd.md Section 29 ENCRYPTED HEALTH
 * RECORD / Section 4.5 "Health Data Is Sensitive").
 *
 * Intentionally a pass-through for this iteration — the team chose to land
 * the flow + backend + real OCR first, and wire real encryption once auth
 * exists (so there's an actual per-user key to encrypt with). Every write
 * in the API routes goes through `encryptForStorage`/read through
 * `decryptFromStorage`, so turning this on for real later means editing
 * only this file — no route handler changes needed.
 *
 * TODO(security): before any real user health data is stored, implement
 * real encryption. Suggested approach: AES-256-GCM via Node's
 * `node:crypto` `createCipheriv`/`createDecipheriv`, key derived per-user
 * once auth exists, IV + authTag stored alongside ciphertext.
 */

export function encryptForStorage<T>(data: T): T {
  return data;
}

export function decryptFromStorage<T>(data: T): T {
  return data;
}
