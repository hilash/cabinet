import fs from "fs/promises";
import path from "path";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import { resolveContentPath, getDataDir } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";
import { ROOT_CABINET_PATH, normalizeCabinetPath } from "@/lib/cabinets/paths";

export function resolveCabinetDir(cabinetPath?: string | null): string {
  const normalized = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  if (normalized === ROOT_CABINET_PATH) {
    return getDataDir();
  }
  return resolveContentPath(normalized);
}

export function cabinetPathFromFs(fsPath: string): string {
  const relativePath = path.relative(getDataDir(), fsPath);
  if (!relativePath || relativePath === ".") {
    return ROOT_CABINET_PATH;
  }
  return relativePath.replace(/\\/g, "/");
}

export async function findOwningCabinetPathForPage(pagePath: string): Promise<string> {
  const resolvedPagePath = resolveContentPath(pagePath);
  let cursor = resolvedPagePath;

  try {
    const stat = await fs.stat(resolvedPagePath);
    if (!stat.isDirectory()) {
      cursor = path.dirname(resolvedPagePath);
    }
  } catch {
    cursor = path.dirname(resolvedPagePath);
  }

  while (cursor.startsWith(getDataDir())) {
    if (await fileExists(path.join(cursor, CABINET_MANIFEST_FILE))) {
      return cabinetPathFromFs(cursor);
    }

    if (cursor === getDataDir()) {
      break;
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  return ROOT_CABINET_PATH;
}
