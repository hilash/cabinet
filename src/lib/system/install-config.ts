import fs from "fs/promises";
import path from "path";
import { INSTALL_CONFIG_PATH } from "@/lib/runtime/runtime-config";
import {
  deleteFileOrDir,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";

export type InstallConfig = Record<string, unknown>;

async function readInstallConfig(): Promise<InstallConfig> {
  try {
    return JSON.parse(await readFileContent(INSTALL_CONFIG_PATH));
  } catch {
    return {};
  }
}

async function writeInstallConfig(config: InstallConfig): Promise<void> {
  await writeFileContent(INSTALL_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

export async function isDirectoryPath(absPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(absPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function setPersistedDataDir(newDir: string): Promise<string> {
  const resolved = path.resolve(newDir);
  if (!(await isDirectoryPath(resolved))) {
    throw new Error("Path must be an existing directory.");
  }
  const config = await readInstallConfig();
  config.dataDir = resolved;
  await writeInstallConfig(config);
  return resolved;
}

export async function clearPersistedDataDir(): Promise<void> {
  const config = await readInstallConfig();
  if (!("dataDir" in config)) return;
  delete config.dataDir;
  if (Object.keys(config).length === 0) {
    await deleteFileOrDir(INSTALL_CONFIG_PATH);
  } else {
    await writeInstallConfig(config);
  }
}
