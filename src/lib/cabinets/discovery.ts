import fs from "fs";
import path from "path";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { cabinetPathFromFs } from "@/lib/cabinets/server-paths";
import { DATA_DIR, isHiddenEntry } from "@/lib/storage/path-utils";

async function walkCabinets(
  dir: string,
  results: string[]
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isHiddenEntry(entry.name)) continue;

    const childDir = path.join(dir, entry.name);
    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(cabinetPathFromFs(childDir));
    }

    await walkCabinets(childDir, results);
  }
}

function walkCabinetsSync(dir: string, results: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isHiddenEntry(entry.name)) continue;

    const childDir = path.join(dir, entry.name);
    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(cabinetPathFromFs(childDir));
    }

    walkCabinetsSync(childDir, results);
  }
}

export async function discoverCabinetPaths(): Promise<string[]> {
  const results = [ROOT_CABINET_PATH];
  await walkCabinets(DATA_DIR, results);
  return results;
}

export function discoverCabinetPathsSync(): string[] {
  const results = [ROOT_CABINET_PATH];
  walkCabinetsSync(DATA_DIR, results);
  return results;
}
