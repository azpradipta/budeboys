/**
 * Encryption for health data at rest (docs/prd.md Section 29 ENCRYPTED
 * HEALTH RECORD / Section 4.5 "Health Data Is Sensitive").
 *
 * Every consultation / prescription row's `data` JSONB column goes through
 * `encryptForStorage` on write and `decryptFromStorage` on read (see
 * app/api/consultations/* and app/api/prescriptions/*). With
 * APP_ENCRYPTION_KEY set, `data` holds an AES-256-GCM envelope instead of
 * plaintext JSON, so anyone with raw DB or backup access (the Supabase
 * dashboard, a leaked dump) sees ciphertext only. Row Level Security stays
 * the access-control layer; this is defence-in-depth for the bytes at rest.
 *
 * Key: APP_ENCRYPTION_KEY — 32 bytes, hex (64 chars) or base64. Generate:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Server-only; never expose with a NEXT_PUBLIC_ prefix. There is no
 * multi-key envelope versioning yet, so rotating the key makes already
 * stored rows unreadable.
 *
 * `aad` (additional authenticated data) binds a ciphertext to a value that
 * is not secret but must not change — the routes pass the owning `user.id`,
 * so a row copied onto another user's id fails its auth-tag check.
 *
 * Backward compatible: rows written before a key existed are plain JSON;
 * `decryptFromStorage` recognises the envelope and passes anything else
 * through untouched. Once the key is set, every new write is encrypted.
 */

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
      `APP_ENCRYPTION_KEY must be 32 bytes as hex (64 chars) or base64 — decoded to ${buf.length} bytes. ` +
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

function warnPlaintextOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[crypto] APP_ENCRYPTION_KEY is not set — health records are being stored UNENCRYPTED. " +
      "Set it to enable AES-256-GCM encryption at rest."
  );
}

/**
 * Encrypt `data` for the `data` JSONB column. Returns an
 * {@link EncryptedEnvelope} (typed as `T` so call sites stay unchanged)
 * when a key is configured, otherwise the value untouched.
 */
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

/**
 * Inverse of {@link encryptForStorage}. Values that are not an envelope
 * (rows written before encryption was enabled) are returned as-is. Throws
 * if an envelope is found but no key is configured, or if the ciphertext /
 * `aad` fails authentication.
 */
export function decryptFromStorage<T>(stored: T, aad?: string): T {
  if (!isEnvelope(stored)) return stored;

  const key = getKey();
  if (!key) {
    throw new Error(
      "Found an encrypted health record but APP_ENCRYPTION_KEY is not set — cannot decrypt."
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
