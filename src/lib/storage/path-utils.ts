import path from "path";
import { getManagedDataDir, isElectronRuntime, PROJECT_ROOT } from "@/lib/runtime/runtime-config";

export const DATA_DIR = getManagedDataDir();
export const CABINET_INTERNAL_DIR = path.join(DATA_DIR, ".cabinet");
export const ROOT_INSTALL_METADATA_PATH = path.join(PROJECT_ROOT, ".cabinet-install.json");
export const DATA_INSTALL_METADATA_PATH = path.join(CABINET_INTERNAL_DIR, "install.json");
export const PROJECT_RELEASE_MANIFEST_PATH = path.join(PROJECT_ROOT, "cabinet-release.json");
export const UPDATE_STATUS_PATH = path.join(CABINET_INTERNAL_DIR, "update-status.json");
export const FILE_SCHEMA_STATE_PATH = path.join(CABINET_INTERNAL_DIR, "file-schema.json");
export const BACKUP_ROOT = isElectronRuntime()
  ? path.join(path.dirname(DATA_DIR), "cabinet-backups")
  : path.resolve(PROJECT_ROOT, "..", ".cabinet-backups", path.basename(PROJECT_ROOT));

export function resolveContentPath(virtualPath: string): string {
  const resolved = path.resolve(DATA_DIR, virtualPath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function virtualPathFromFs(fsPath: string): string {
  return fsPath.replace(DATA_DIR, "").replace(/^\//, "");
}

export function canonicalizeVirtualPagePath(virtualPath: string): string {
  const normalized = virtualPath.trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!normalized) return normalized;
  if (normalized.endsWith("/index.md")) {
    return normalized.slice(0, -"/index.md".length);
  }
  if (normalized.endsWith(".md")) {
    return normalized.slice(0, -".md".length);
  }
  return normalized;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md");
}

export function isHiddenEntry(name: string): boolean {
  return name.startsWith(".");
}
