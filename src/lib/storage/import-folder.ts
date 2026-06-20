import fs from "fs/promises";
import path from "path";
import { resolveContentPath, sanitizeFilename } from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists } from "@/lib/storage/fs-operations";
import { invalidateTreeCache } from "@/lib/storage/tree-builder";
import { autoCommit } from "@/lib/git/git-service";

const MAX_BYTES = 500 * 1024 * 1024; // 500MB total
const MAX_FILES = 5000;
const SKIP_NAMES = new Set([".git", "node_modules", ".DS_Store", ".cabinet-state"]);
const EXECUTABLE_EXTENSIONS = new Set([
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".dmg", ".app", ".pkg",
  ".deb", ".rpm", ".sh", ".bash", ".zsh", ".ps1",
]);

function shouldSkip(name: string): boolean {
  // Skip VCS/dependency junk and dotfiles — knowledge folders rarely need them
  // and they bloat the import. Executables are filtered separately, per file.
  return SKIP_NAMES.has(name) || name.startsWith(".");
}

async function copyDir(
  src: string,
  dest: string,
  ctx: { bytes: number; files: number }
): Promise<void> {
  await ensureDirectory(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;
    // Never follow symlinks: keeps the import inside the chosen folder.
    if (entry.isSymbolicLink()) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to, ctx);
    } else if (entry.isFile()) {
      if (EXECUTABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      const stat = await fs.stat(from);
      ctx.bytes += stat.size;
      ctx.files += 1;
      if (ctx.bytes > MAX_BYTES) {
        throw new Error(`Folder exceeds the ${MAX_BYTES / 1024 / 1024}MB import limit.`);
      }
      if (ctx.files > MAX_FILES) {
        throw new Error(`Folder exceeds the ${MAX_FILES}-file import limit.`);
      }
      await fs.copyFile(from, to);
    }
  }
}

/**
 * Recursively copy a source directory into the cabinet tree under `parentPath`,
 * picking a collision-free destination name. Shared by the Import Folder and
 * Import Notion routes. Returns the new virtual (tree) path.
 *
 * @param nameOverride display name for the destination folder (defaults to the
 *   source's basename). Used by Notion import to land under a "Notion" folder
 *   instead of the random temp-dir name.
 */
export async function importDirectory(
  source: string,
  parentPath = "",
  nameOverride?: string
): Promise<{ path: string }> {
  const resolvedSource = path.resolve(source);
  const srcStat = await fs.stat(resolvedSource).catch(() => null);
  if (!srcStat || !srcStat.isDirectory()) {
    throw new Error("Source must be an existing directory.");
  }

  const cleanParent = parentPath.trim().replace(/^\/+|\/+$/g, "");
  const baseName =
    sanitizeFilename(nameOverride ?? path.basename(resolvedSource)) || "folder";

  let folderName = baseName;
  let counter = 1;
  while (
    await fileExists(
      resolveContentPath(cleanParent ? `${cleanParent}/${folderName}` : folderName)
    )
  ) {
    folderName = `${baseName}-${counter}`;
    counter++;
  }

  const virtualPath = cleanParent ? `${cleanParent}/${folderName}` : folderName;
  await copyDir(resolvedSource, resolveContentPath(virtualPath), { bytes: 0, files: 0 });

  invalidateTreeCache();
  autoCommit(virtualPath, "Add");
  return { path: virtualPath };
}
