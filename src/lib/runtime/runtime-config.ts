import fs from "fs";
import os from "os";
import path from "path";

export const PROJECT_ROOT = process.cwd();
const DEFAULT_RELEASE_MANIFEST_URL =
  "https://github.com/hilash/cabinet/releases/latest/download/cabinet-release.json";

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function defaultElectronDataDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Cabinet");
  }
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "Cabinet"
    );
  }
  return path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
    "cabinet"
  );
}

export function getCabinetRuntime(): "source" | "electron" {
  return process.env.CABINET_RUNTIME === "electron" ? "electron" : "source";
}

export function isElectronRuntime(): boolean {
  return getCabinetRuntime() === "electron";
}

export function isDockerRuntime(): boolean {
  if (process.env.CABINET_INSTALL_KIND === "docker" || process.env.CABINET_DOCKER === "1") {
    return true;
  }

  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

export function getManagedDataDir(): string {
  const configured = process.env.CABINET_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  if (isElectronRuntime()) {
    return defaultElectronDataDir();
  }

  return path.join(PROJECT_ROOT, "data");
}

export function getAppPort(): number {
  return parsePort(process.env.CABINET_APP_PORT || process.env.PORT, 3000);
}

export function getDaemonPort(): number {
  return parsePort(process.env.CABINET_DAEMON_PORT, 3001);
}

export function getAppOrigin(): string {
  return normalizeOrigin(process.env.CABINET_APP_ORIGIN) || `http://127.0.0.1:${getAppPort()}`;
}

export function getPublicDaemonOrigin(): string {
  return (
    normalizeOrigin(process.env.CABINET_PUBLIC_DAEMON_ORIGIN) ||
    `http://127.0.0.1:${getDaemonPort()}`
  );
}

export function getPublicDaemonWsOrigin(): string {
  const origin = getPublicDaemonOrigin();
  if (origin.startsWith("ws://") || origin.startsWith("wss://")) {
    return origin;
  }
  if (origin.startsWith("https://")) {
    return origin.replace(/^https:/, "wss:");
  }
  return origin.replace(/^http:/, "ws:");
}

export function getDaemonUrl(): string {
  return normalizeOrigin(process.env.CABINET_DAEMON_URL) || getPublicDaemonOrigin();
}

export function getReleaseManifestUrl(): string {
  return (
    normalizeOrigin(process.env.CABINET_RELEASE_MANIFEST_URL) ||
    DEFAULT_RELEASE_MANIFEST_URL
  );
}

