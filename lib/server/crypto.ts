// Enkripsi AES-256-GCM untuk kolom `data` tabel consultations & prescriptions.
// `aad` mengikat ciphertext ke user id, dan row lama tanpa enkripsi tetap lewat.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";
const ENVELOPE_TAG = "healthalk.aes-256-gcm.v1";

interface EncryptedEnvelope {
  __enc: typeof ENVELOPE_TAG;
  iv: string;
  tag: string;
  ct: string;
}

let cachedKey: Buffer | null | undefined;
let warned = false;

function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    cachedKey = null;
    return null;
  }

  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must be 32 bytes as hex (64 chars) or base64, but decoded to ${buf.length} bytes. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  cachedKey = buf;
  return buf;
}

function isEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.__enc === ENVELOPE_TAG &&
    typeof v.iv === "string" &&
    typeof v.tag === "string" &&
    typeof v.ct === "string"
  );
}

// True bila APP_ENCRYPTION_KEY terpasang; melempar error kalau formatnya salah.
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

// True bila nilai `data` yang tersimpan sudah berupa envelope terenkripsi.
export function isStoredEncrypted(value: unknown): boolean {
  return isEnvelope(value);
}

function warnPlaintextOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[crypto] APP_ENCRYPTION_KEY is not set, so health records are being stored UNENCRYPTED. " +
      "Set it to enable AES-256-GCM encryption at rest."
  );
}

// Mengembalikan envelope terenkripsi bila key ada, kalau tidak nilai aslinya.
export function encryptForStorage<T>(data: T, aad?: string): T {
  const key = getKey();
  if (!key) {
    warnPlaintextOnce();
    return data;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));

  const ct = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  const envelope: EncryptedEnvelope = {
    __enc: ENVELOPE_TAG,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
  return envelope as unknown as T;
}

// Kebalikan encryptForStorage. Error bila envelope ada tapi key tidak.
export function decryptFromStorage<T>(stored: T, aad?: string): T {
  if (!isEnvelope(stored)) return stored;

  const key = getKey();
  if (!key) {
    throw new Error(
      "Found an encrypted health record but APP_ENCRYPTION_KEY is not set, so it cannot be decrypted."
    );
  }

  const decipher = createDecipheriv(ALG, key, Buffer.from(stored.iv, "base64"));
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));

  const pt = Buffer.concat([
    decipher.update(Buffer.from(stored.ct, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(pt.toString("utf8")) as T;
}
