import fs from "fs/promises";
import path from "path";
import {
  CABINET_LINK_META_CANDIDATES,
} from "@/lib/cabinets/files";
import { DATA_DIR } from "./path-utils";

export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isSymlink: boolean;
}

export interface StatInfo {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: Date;
}

export async function readFileContent(absPath: string): Promise<string> {
  return fs.readFile(absPath, "utf-8");
}

export async function writeFileContent(
  absPath: string,
  content: string
): Promise<void> {
  await fs.writeFile(absPath, content, "utf-8");
}

export async function appendFileContent(
  absPath: string,
  content: string
): Promise<void> {
  await fs.appendFile(absPath, content, "utf-8");
}

export async function readBinary(absPath: string): Promise<Buffer> {
  return fs.readFile(absPath);
}

export async function writeBinary(absPath: string, data: Buffer): Promise<void> {
  await fs.writeFile(absPath, data);
}

export async function readBinaryRange(
  absPath: string,
  start: number,
  end: number
): Promise<Buffer> {
  const length = end - start + 1;
  const buffer = Buffer.alloc(length);
  const handle = await fs.open(absPath, "r");
  try {
    await handle.read(buffer, 0, length, start);
  } finally {
    await handle.close();
  }
  return buffer;
}

export async function deleteFileOrDir(absPath: string): Promise<void> {
  await fs.rm(absPath, { recursive: true, force: true });
}

export async function listDirectory(absPath: string): Promise<DirEntry[]> {
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  return Promise.all(
    entries.map(async (entry) => {
      let isDirectory = entry.isDirectory();
      const isSymlink = entry.isSymbolicLink();

      if (!isDirectory && isSymlink) {
        try {
          const stats = await fs.stat(path.join(absPath, entry.name));
          isDirectory = stats.isDirectory();
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
    for (const filename of CABINET_LINK_META_CANDIDATES) {
      await fs.unlink(path.join(resolvedTarget, filename)).catch(() => {});
    }
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

export async function stat(absPath: string): Promise<StatInfo | null> {
  try {
    const stats = await fs.lstat(absPath);
    const isSymlink = stats.isSymbolicLink();
    let resolvedStats = stats;
    if (isSymlink) {
      try {
        resolvedStats = await fs.stat(absPath);
      } catch {
        return {
          isFile: false,
          isDirectory: false,
          isSymlink: true,
          size: stats.size,
          mtime: stats.mtime,
        };
      }
    }
    return {
      isFile: resolvedStats.isFile(),
      isDirectory: resolvedStats.isDirectory(),
      isSymlink,
      size: resolvedStats.size,
      mtime: resolvedStats.mtime,
    };
  } catch {
    return null;
  }
}

export async function rename(from: string, to: string): Promise<void> {
  await fs.rename(from, to);
}

export async function copyFile(from: string, to: string): Promise<void> {
  await fs.copyFile(from, to);
}

export async function readlink(absPath: string): Promise<string | null> {
  try {
    return await fs.readlink(absPath);
  } catch {
    return null;
  }
}

export async function realpath(absPath: string): Promise<string> {
  try {
    return await fs.realpath(absPath);
  } catch {
    return absPath;
  }
}

export async function ensureDataDir(): Promise<void> {
  await ensureDirectory(DATA_DIR);
}
