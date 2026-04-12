import path from "path";
import { DATA_DIR, resolveContentPath } from "@/lib/storage/path-utils";
import { ROOT_CABINET_PATH, normalizeCabinetPath } from "@/lib/cabinets/paths";

export function resolveCabinetDir(cabinetPath?: string | null): string {
  const normalized = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  if (normalized === ROOT_CABINET_PATH) {
    return DATA_DIR;
  }
  return resolveContentPath(normalized);
}

export function cabinetPathFromFs(fsPath: string): string {
  const relativePath = path.relative(DATA_DIR, fsPath);
  if (!relativePath || relativePath === ".") {
    return ROOT_CABINET_PATH;
  }
  return relativePath.replace(/\\/g, "/");
}
