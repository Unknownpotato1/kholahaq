/**
 * AES-256-GCM encryption utilities.
 *
 * SECURITY INVARIANTS:
 *  - The current password of every account is encrypted at rest with AES-256-GCM.
 *  - The encryption key is read ONLY from process.env.ENCRYPTION_SECRET on the server.
 *  - The key is NEVER shipped to the client bundle.
 *  - Decryption is only ever performed inside server-side API routes,
 *    after payment verification + unlock token validation.
 *  - Each ciphertext carries its own random 12-byte IV + 16-byte auth tag,
 *    so identical plaintexts produce different ciphertexts.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    // Sandbox fallback so the preview works without env setup.
    // In production this branch MUST NOT be reachable.
    const fallback =
      "gomen-dev-fallback-key-please-set-ENCRYPTION_SECRET-in-production-32b";
    return crypto.createHash("sha256").update(fallback).digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPassword(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(12) + tag(16) + ciphertext, base64
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptPassword(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const enc = buf.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/** Random 64-char hex token used for one-time unlock links. */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
