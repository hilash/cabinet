/**
 * AES-256-GCM encrypt/decrypt for Gmail App Passwords.
 * Server-side only — never import in client components.
 */

import crypto from "crypto";
import { DATA_DIR } from "@/lib/storage/path-utils";

const ALGORITHM = "aes-256-gcm";
const SALT = "cabinet-gmail-v1";
const ITERATIONS = 100_000;
const KEY_LEN = 32;
const DIGEST = "sha256";

function deriveKey(): Buffer {
  // Use DATA_DIR as part of the passphrase so the key is installation-specific.
  const passphrase = `cabinet:${DATA_DIR}:gmail`;
  return crypto.pbkdf2Sync(passphrase, SALT, ITERATIONS, KEY_LEN, DIGEST);
}

export function encryptPassword(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Store as iv:authTag:ciphertext — all hex
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptPassword(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted password format");
  const [ivHex, authTagHex, encHex] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
