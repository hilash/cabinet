import type Database from "better-sqlite3";
import type { CabinetConfig } from "../src/lib/config/schema";

export interface ServiceContext {
  signal: AbortSignal;
  dataDir: string;
  db: Database.Database;
  config: CabinetConfig;
  log: (msg: string) => void;
}

export interface ServiceHealth {
  status: "up" | "starting" | "down";
  lastError?: string;
}

export interface ServiceModule {
  name: string;
  start(ctx: ServiceContext): Promise<void>;
  stop(): Promise<void>;
  reload?(): Promise<void>;
  health(): ServiceHealth;
}

export function formatServiceError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack || `${err.name}: ${err.message}`;
  }

  return String(err);
}

export function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export function createServiceState(initialStatus: ServiceHealth["status"] = "down") {
  let status: ServiceHealth["status"] = initialStatus;
  let lastError: string | undefined;

  return {
    starting() {
      status = "starting";
    },
    up() {
      status = "up";
      lastError = undefined;
    },
    down(err?: unknown) {
      status = "down";
      if (err !== undefined) {
        lastError = formatServiceError(err);
      } else {
        lastError = undefined;
      }
    },
    health(): ServiceHealth {
      return lastError ? { status, lastError } : { status };
    },
  };
}
