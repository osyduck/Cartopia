import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

// AES-256-GCM at-rest encryption for secrets we must be able to read back
// (data-plane admin passwords). Key derived from APP_SECRET.
const key = createHash("sha256").update(env.APP_SECRET).digest();

/** Returns "iv:tag:ciphertext", all base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB, tagB, dataB] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Cryptographically strong password for generated DB roles. */
export function generatePassword(bytes = 18): string {
  // URL-safe, no ambiguous chars from base64url padding.
  return randomBytes(bytes).toString("base64url");
}
