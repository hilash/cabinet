import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getDaemonUrl as getConfiguredDaemonUrl } from "@/lib/runtime/runtime-config";

const DAEMON_RUNTIME_DIR = path.join(DATA_DIR, ".agents", ".runtime");
const DAEMON_TOKEN_PATH = path.join(DAEMON_RUNTIME_DIR, "daemon-token");

let cachedToken: string | null = null;

export function getDaemonUrl(): string {
  return getConfiguredDaemonUrl();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getOrCreateDaemonTokenSync(): string {
  if (cachedToken) {
    return cachedToken;
  }

  const envToken = process.env.CABINET_DAEMON_TOKEN?.trim();
  if (envToken) {
    cachedToken = envToken;
    return envToken;
  }

  fs.mkdirSync(DAEMON_RUNTIME_DIR, { recursive: true });

  if (fs.existsSync(DAEMON_TOKEN_PATH)) {
    const existing = fs.readFileSync(DAEMON_TOKEN_PATH, "utf8").trim();
    if (existing) {
      cachedToken = existing;
      return existing;
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  try {
    const fd = fs.openSync(DAEMON_TOKEN_PATH, "wx", 0o600);
    fs.writeFileSync(fd, `${token}\n`, { encoding: "utf8" });
    fs.closeSync(fd);
    cachedToken = token;
    return token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }

    const existing = fs.readFileSync(DAEMON_TOKEN_PATH, "utf8").trim();
    if (!existing) {
      throw new Error("Daemon token file exists but is empty.");
    }
    cachedToken = existing;
    return existing;
  }
}

export async function getOrCreateDaemonToken(): Promise<string> {
  return getOrCreateDaemonTokenSync();
}

export function getTokenFromAuthorizationHeader(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function isDaemonTokenValid(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  return safeEqual(candidate, getOrCreateDaemonTokenSync());
}
