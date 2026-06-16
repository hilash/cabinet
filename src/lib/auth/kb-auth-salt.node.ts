/**
 * Node-only: ensure a per-install auth salt exists.
 *
 * On first run (no CABINET_AUTH_SALT yet) this generates a random 32-byte hex
 * salt and persists it to `.cabinet.env` via `upsertCabinetEnv` (atomic 0600
 * write + gitignore guard + live `process.env` update). Idempotent: a non-empty
 * value is left untouched. Best-effort — on any failure the auth path falls back
 * to the legacy fixed salt (see getAuthSalt), so a write error never blocks boot.
 *
 * This file imports node:crypto + the filesystem-backed env store, so it must
 * NOT be imported from the portable `kb-auth.ts`. Call it once at server boot
 * (src/instrumentation.ts), after `.cabinet.env` is loaded into process.env.
 */
import crypto from "node:crypto";
import { upsertCabinetEnv } from "@/lib/runtime/cabinet-env";

export function ensureAuthSalt(): void {
  if (process.env.CABINET_AUTH_SALT?.trim()) return;
  const salt = crypto.randomBytes(32).toString("hex");
  upsertCabinetEnv("CABINET_AUTH_SALT", salt);
}
