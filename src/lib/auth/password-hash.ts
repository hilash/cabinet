import * as crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const AUTH_SALT_BYTES = 16;
const HASH_BYTES = 32;
const AUTH_SALT_PATH = path.join(process.cwd(), "data/.agents/.config/auth-salt");
const HEX_RE = /^[0-9a-f]+$/i;

export const passwordHashRuntime = {
  randomBytes: crypto.randomBytes,
  scryptSync: crypto.scryptSync,
  timingSafeEqual: crypto.timingSafeEqual,
};

function isValidHex(value: string, bytes: number): boolean {
  return value.length === bytes * 2 && HEX_RE.test(value);
}

async function readSaltFile(): Promise<string | null> {
  try {
    const saltHex = (await readFile(AUTH_SALT_PATH, "utf8")).trim();
    if (!isValidHex(saltHex, AUTH_SALT_BYTES)) {
      throw new Error(`Invalid auth salt at ${AUTH_SALT_PATH}`);
    }
    return saltHex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function ensureAuthSalt(): Promise<string> {
  const existingSalt = await readSaltFile();
  if (existingSalt) {
    return existingSalt;
  }

  await mkdir(path.dirname(AUTH_SALT_PATH), { recursive: true });
  const newSalt = passwordHashRuntime.randomBytes(AUTH_SALT_BYTES).toString("hex");

  try {
    await writeFile(AUTH_SALT_PATH, newSalt, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return newSalt;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }

  const createdSalt = await readSaltFile();
  if (createdSalt) {
    return createdSalt;
  }

  throw new Error(`Failed to initialize auth salt at ${AUTH_SALT_PATH}`);
}

function derivePasswordHash(password: string, saltHex: string): Buffer {
  return passwordHashRuntime.scryptSync(password, saltHex, HASH_BYTES);
}

function normalizeExpectedHash(expectedHex: string, actualLength: number): {
  buffer: Buffer;
  isValid: boolean;
} {
  const trimmed = expectedHex.trim();
  if (isValidHex(trimmed, actualLength)) {
    return {
      buffer: Buffer.from(trimmed, "hex"),
      isValid: true,
    };
  }

  return {
    buffer: Buffer.alloc(actualLength),
    isValid: false,
  };
}

const authSaltPromise = ensureAuthSalt();

export async function hashPassword(password: string): Promise<string> {
  const saltHex = await authSaltPromise;
  return derivePasswordHash(password, saltHex).toString("hex");
}

export async function verifyPassword(password: string, expectedHex: string): Promise<boolean> {
  const saltHex = await authSaltPromise;
  const actualHash = derivePasswordHash(password, saltHex);
  const expectedHash = normalizeExpectedHash(expectedHex, actualHash.length);
  const matches = passwordHashRuntime.timingSafeEqual(actualHash, expectedHash.buffer);
  return expectedHash.isValid && matches;
}
