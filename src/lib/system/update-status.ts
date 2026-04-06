import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { UPDATE_STATUS_PATH } from "@/lib/storage/path-utils";
import type { UpdateStatus } from "@/types";

const DEFAULT_STATUS: UpdateStatus = {
  state: "idle",
};

async function ensureStatusDir(): Promise<void> {
  await fs.mkdir(path.dirname(UPDATE_STATUS_PATH), { recursive: true });
}

function ensureStatusDirSync(): void {
  fsSync.mkdirSync(path.dirname(UPDATE_STATUS_PATH), { recursive: true });
}

export async function readUpdateStatus(): Promise<UpdateStatus> {
  try {
    const raw = await fs.readFile(UPDATE_STATUS_PATH, "utf-8");
    return { ...DEFAULT_STATUS, ...(JSON.parse(raw) as UpdateStatus) };
  } catch {
    return DEFAULT_STATUS;
  }
}

export function readUpdateStatusSync(): UpdateStatus {
  try {
    const raw = fsSync.readFileSync(UPDATE_STATUS_PATH, "utf-8");
    return { ...DEFAULT_STATUS, ...(JSON.parse(raw) as UpdateStatus) };
  } catch {
    return DEFAULT_STATUS;
  }
}

export async function writeUpdateStatus(status: UpdateStatus): Promise<void> {
  await ensureStatusDir();
  await fs.writeFile(UPDATE_STATUS_PATH, JSON.stringify(status, null, 2), "utf-8");
}

export function writeUpdateStatusSync(status: UpdateStatus): void {
  ensureStatusDirSync();
  fsSync.writeFileSync(UPDATE_STATUS_PATH, JSON.stringify(status, null, 2), "utf-8");
}

