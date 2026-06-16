import fs from "fs";
import path from "path";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { cabinetPathFromFs } from "@/lib/cabinets/server-paths";
import { DATA_DIR, isHiddenEntry } from "@/lib/storage/path-utils";

/**
 * Cabinets can be mounted into data/ via directory symlinks (e.g.
 * data/<home>/cabinet-data -> an external checkout). A symlink Dirent reports
 * isDirectory() === false, so a plain directory walk silently skips every
 * cabinet behind it — conversations there then can't be resolved by id alone
 * (daemon finalize, completion polls, transcript sync all do that) and runs
 * never persist their result. Follow directory symlinks, with a
 * visited-realpath set guarding against cycles and diamond mounts.
 */
function shouldWalkSync(entry: fs.Dirent, childDir: string, visited: Set<string>): boolean {
  if (isHiddenEntry(entry.name)) return false;
  if (!entry.isDirectory() && !entry.isSymbolicLink()) return false;
  let real: string;
  try {
    real = fs.realpathSync(childDir);
    if (entry.isSymbolicLink() && !fs.statSync(childDir).isDirectory()) return false;
  } catch {
    return false; // broken symlink / unreadable
  }
  if (visited.has(real)) return false;
  visited.add(real);
  return true;
}

async function walkCabinets(
  dir: string,
  results: string[],
  visited: Set<string>
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const childDir = path.join(dir, entry.name);
    if (!shouldWalkSync(entry, childDir, visited)) continue;

    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(cabinetPathFromFs(childDir));
    }

    await walkCabinets(childDir, results, visited);
  }
}

function walkCabinetsSync(dir: string, results: string[], visited: Set<string>): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const childDir = path.join(dir, entry.name);
    if (!shouldWalkSync(entry, childDir, visited)) continue;

    if (fs.existsSync(path.join(childDir, CABINET_MANIFEST_FILE))) {
      results.push(cabinetPathFromFs(childDir));
    }

    walkCabinetsSync(childDir, results, visited);
  }
}

function seedVisited(): Set<string> {
  // Seed with the data root so a symlink pointing back above/at DATA_DIR
  // can't re-walk the whole tree through itself.
  const visited = new Set<string>();
  try {
    visited.add(fs.realpathSync(DATA_DIR));
  } catch {
    /* data dir missing — walk will no-op anyway */
  }
  return visited;
}

// 10-second TTL. Cabinet discovery walks the full data/ tree; hit by the
// events SSE every 3s, scheduler, gallery, and persona manager.
const discoveryCache = createTtlCache<string[]>({ ttlMs: 10_000 });

export function invalidateCabinetDiscoveryCache() {
  discoveryCache.invalidate();
}

export async function discoverCabinetPaths(): Promise<string[]> {
  return discoveryCache.get("all", async () => {
    const results = [ROOT_CABINET_PATH];
    await walkCabinets(DATA_DIR, results, seedVisited());
    return results;
  });
}

export function discoverCabinetPathsSync(): string[] {
  const results = [ROOT_CABINET_PATH];
  walkCabinetsSync(DATA_DIR, results, seedVisited());
  return results;
}
