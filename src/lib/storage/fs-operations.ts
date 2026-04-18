import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "./path-utils";

export async function readFileContent(absPath: string): Promise<string> {
  return fs.readFile(absPath, "utf-8");
}

export async function writeFileContent(
  absPath: string,
  content: string
): Promise<void> {
  await fs.writeFile(absPath, content, "utf-8");
}

export async function deleteFileOrDir(absPath: string): Promise<void> {
  await fs.rm(absPath, { recursive: true, force: true });
}

export async function listDirectory(
  absPath: string
): Promise<{ name: string; isDirectory: boolean; isSymlink: boolean }[]> {
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  return Promise.all(
    entries.map(async (entry) => {
      let isDirectory = entry.isDirectory();
      const isSymlink = entry.isSymbolicLink();

      if (!isDirectory && isSymlink) {
        try {
          const stat = await fs.stat(path.join(absPath, entry.name));
          isDirectory = stat.isDirectory();
        } catch {
          isDirectory = false;
        }
      }

      return { name: entry.name, isDirectory, isSymlink };
    })
  );
}

export async function unlinkSymlink(absPath: string): Promise<void> {
  try {
    const target = await fs.readlink(absPath);
    const resolvedTarget = path.resolve(path.dirname(absPath), target);
    const cabinetYaml = path.join(resolvedTarget, ".cabinet.yaml");
    await fs.unlink(cabinetYaml).catch(() => {});
  } catch {
    // target may be broken — still remove the symlink
  }
  await fs.unlink(absPath);
}

export async function ensureDirectory(absPath: string): Promise<void> {
  await fs.mkdir(absPath, { recursive: true });
}

export async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDataDir(): Promise<void> {
  await ensureDirectory(DATA_DIR);
}

export interface WalkedFile {
  absPath: string;
  name: string;
  modifiedIso: string;
}

export async function walkFilesWithMtime(rootDir: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        const sub = await walkFilesWithMtime(fullPath);
        results.push(...sub);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          results.push({
            absPath: fullPath,
            name: entry.name,
            modifiedIso: stat.mtime.toISOString(),
          });
        } catch {
          // skip files we can't stat
        }
      }
    }
  } catch {
    // rootDir missing; return empty
  }
  return results;
}

export async function copyDirectoryRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
