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
): Promise<{ name: string; isDirectory: boolean }[]> {
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  return Promise.all(
    entries.map(async (entry) => {
      let isDirectory = entry.isDirectory();

      if (!isDirectory && entry.isSymbolicLink()) {
        try {
          const stat = await fs.stat(path.join(absPath, entry.name));
          isDirectory = stat.isDirectory();
        } catch {
          isDirectory = false;
        }
      }

      return { name: entry.name, isDirectory };
    })
  );
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
