import path from "path";
import { getManagedDataDir, isElectronRuntime, PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import { readTenantIdFromContext } from "@/lib/runtime/tenant-context";

/**
 * Base data directory — the install's root data location, *unscoped* by tenant.
 * In OSS this is the only level that exists. In cloud editions this is the
 * parent of every tenant's working directory.
 */
function getBaseDataDir(): string {
  return getManagedDataDir();
}

/**
 * Per-request data directory. In OSS = base. In Cabinet Cloud = base/{tenantId}
 * resolved synchronously via AsyncLocalStorage set by the per-route wrapper.
 *
 * Cabinet code MUST call this function at request time — never as a module
 * load constant. `const X = path.join(DATA_DIR, ".chat")` evaluates at module
 * load (before any tenant context exists) and breaks isolation in cloud.
 * Use `path.join(getDataDir(), ".chat")` inline at the call site, or wrap in
 * a function: `function getChatDir() { return path.join(getDataDir(), ".chat"); }`.
 */
export function getDataDir(): string {
  const tenantId = readTenantIdFromContext();
  const base = getBaseDataDir();
  return tenantId ? path.join(base, tenantId) : base;
}

/**
 * @deprecated Use {@link getDataDir} instead — `DATA_DIR` evaluates at module
 * load (no tenant context yet) so it always returns the install's base
 * directory. In Cabinet Cloud this means cross-tenant data leakage. The
 * export is kept only so existing OSS imports keep compiling; new code and
 * any cloud-relevant code path must call `getDataDir()` per request.
 */
export const DATA_DIR = getBaseDataDir();

export function getCabinetInternalDir(): string {
  return path.join(getDataDir(), ".cabinet-state");
}

export function getDataInstallMetadataPath(): string {
  return path.join(getCabinetInternalDir(), "install.json");
}

export function getUpdateStatusPath(): string {
  return path.join(getCabinetInternalDir(), "update-status.json");
}

export function getFileSchemaStatePath(): string {
  return path.join(getCabinetInternalDir(), "file-schema.json");
}

export function getBackupRoot(): string {
  return isElectronRuntime()
    ? path.join(path.dirname(getDataDir()), "cabinet-backups")
    : path.resolve(PROJECT_ROOT, "..", ".cabinet-backups", path.basename(PROJECT_ROOT));
}

// Same back-compat caveat as DATA_DIR: these snapshot the *base* DATA_DIR at
// module load. They're kept so existing imports compile, but call the
// `get*` function above at request time for tenant-correct paths.
/** @deprecated Use {@link getCabinetInternalDir} */
export const CABINET_INTERNAL_DIR = path.join(getBaseDataDir(), ".cabinet-state");
/** @deprecated Use {@link getDataInstallMetadataPath} */
export const DATA_INSTALL_METADATA_PATH = path.join(CABINET_INTERNAL_DIR, "install.json");
/** @deprecated Use {@link getUpdateStatusPath} */
export const UPDATE_STATUS_PATH = path.join(CABINET_INTERNAL_DIR, "update-status.json");
/** @deprecated Use {@link getFileSchemaStatePath} */
export const FILE_SCHEMA_STATE_PATH = path.join(CABINET_INTERNAL_DIR, "file-schema.json");
/** @deprecated Use {@link getBackupRoot} */
export const BACKUP_ROOT = isElectronRuntime()
  ? path.join(path.dirname(getBaseDataDir()), "cabinet-backups")
  : path.resolve(PROJECT_ROOT, "..", ".cabinet-backups", path.basename(PROJECT_ROOT));

// Constants in PROJECT_ROOT (image-baked, not tenant data) stay constant.
export const ROOT_INSTALL_METADATA_PATH = path.join(PROJECT_ROOT, ".cabinet-install.json");
export const PROJECT_RELEASE_MANIFEST_PATH = path.join(PROJECT_ROOT, "cabinet-release.json");

export function resolveContentPath(virtualPath: string): string {
  const dataDir = getDataDir();
  const resolved = path.resolve(dataDir, virtualPath);
  if (!resolved.startsWith(dataDir)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function virtualPathFromFs(fsPath: string): string {
  return fsPath.replace(getDataDir(), "").replace(/^\//, "");
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

const IGNORED_DIRS = new Set(["node_modules", "__pycache__", ".venv", "dist", "build", "out", "coverage"]);

export function isHiddenEntry(name: string): boolean {
  return name.startsWith(".") || IGNORED_DIRS.has(name);
}
