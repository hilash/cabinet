import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { BACKUP_ROOT, DATA_DIR } from "@/lib/storage/path-utils";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";

const PROJECT_BACKUP_IGNORES = new Set([
  ".git",
  ".next",
  "node_modules",
  ".cabinet-backups",
  "out",
  "dist",
  "coverage",
]);

function timestampToken(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function shouldCopyProjectRelative(relativePath: string): boolean {
  if (!relativePath) return true;
  const first = relativePath.split(path.sep)[0];
  return !PROJECT_BACKUP_IGNORES.has(first);
}

async function ensureBackupRoot(): Promise<void> {
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
}

function ensureBackupRootSync(): void {
  fsSync.mkdirSync(BACKUP_ROOT, { recursive: true });
}

export async function createDataBackup(reason = "manual-backup"): Promise<string> {
  await ensureBackupRoot();
  const destination = path.join(BACKUP_ROOT, `${timestampToken()}-${reason}`, "data");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.cp(DATA_DIR, destination, { recursive: true });
  return destination;
}

export function createDataBackupSync(reason = "pre-migration"): string {
  ensureBackupRootSync();
  const destination = path.join(BACKUP_ROOT, `${timestampToken()}-${reason}`, "data");
  fsSync.mkdirSync(path.dirname(destination), { recursive: true });
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
  fsSync.cpSync(DATA_DIR, destination, { recursive: true });
  return destination;
}

export async function createProjectSnapshotBackup(reason = "pre-update"): Promise<string> {
  await ensureBackupRoot();
  const destination = path.join(BACKUP_ROOT, `${timestampToken()}-${reason}`, "project");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(PROJECT_ROOT, destination, {
    recursive: true,
    filter: (src) => {
      const relative = path.relative(PROJECT_ROOT, src);
      return shouldCopyProjectRelative(relative);
    },
  });
  return destination;
}
