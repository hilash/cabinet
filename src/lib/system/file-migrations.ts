import fs from "fs";
import path from "path";
import {
  CABINET_INTERNAL_DIR,
  DATA_DIR,
  FILE_SCHEMA_STATE_PATH,
} from "@/lib/storage/path-utils";
import type { DataMigration, FileSchemaState } from "@/types";
import { createDataBackupSync } from "./backup";

const BASELINE_FILE_SCHEMA_VERSION = 1;
const FILE_MIGRATIONS: DataMigration[] = [];

function readFileSchemaStateSync(): FileSchemaState | null {
  try {
    const raw = fs.readFileSync(FILE_SCHEMA_STATE_PATH, "utf-8");
    return JSON.parse(raw) as FileSchemaState;
  } catch {
    return null;
  }
}

function writeFileSchemaStateSync(state: FileSchemaState): void {
  fs.mkdirSync(path.dirname(FILE_SCHEMA_STATE_PATH), { recursive: true });
  fs.writeFileSync(FILE_SCHEMA_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export function runFileMigrationsSync(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(CABINET_INTERNAL_DIR, { recursive: true });

  const state = readFileSchemaStateSync();
  const currentVersion = state?.version ?? BASELINE_FILE_SCHEMA_VERSION;
  const pending = FILE_MIGRATIONS
    .filter((migration) => migration.version > currentVersion)
    .sort((left, right) => left.version - right.version);

  if (pending.length === 0) {
    if (!state) {
      writeFileSchemaStateSync({
        version: BASELINE_FILE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      });
    }
    return;
  }

  const backupPath = createDataBackupSync("pre-file-migration");
  let appliedVersion = currentVersion;

  for (const migration of pending) {
    migration.runSync();
    appliedVersion = migration.version;
  }

  writeFileSchemaStateSync({
    version: appliedVersion,
    updatedAt: new Date().toISOString(),
    backupPath,
  });
}

