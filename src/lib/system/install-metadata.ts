import fsSync from "fs";
import path from "path";
import { simpleGit } from "simple-git";
import { DATA_INSTALL_METADATA_PATH, ROOT_INSTALL_METADATA_PATH, getDataDir } from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import {
  isElectronRuntime,
  PROJECT_ROOT,
} from "@/lib/runtime/runtime-config";
import type { InstallKind, InstallMetadata } from "@/types";

const APP_PATH_IGNORES = [
  ".git/",
  ".next/",
  "data/",
  "node_modules/",
  ".cabinet-backups/",
];

export async function readInstallMetadata(): Promise<InstallMetadata | null> {
  const candidates = [ROOT_INSTALL_METADATA_PATH, DATA_INSTALL_METADATA_PATH];

  for (const candidate of candidates) {
    try {
      const raw = await readFileContent(candidate);
      return JSON.parse(raw) as InstallMetadata;
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function writeInstallMetadata(metadata: InstallMetadata): Promise<void> {
  await ensureDirectory(getDataDir());
  await ensureDirectory(path.dirname(DATA_INSTALL_METADATA_PATH));

  const payload = JSON.stringify(metadata, null, 2);
  // ROOT path lives in PROJECT_ROOT and may be read-only (cloud / packaged
  // builds); failing here shouldn't block the getDataDir() write.
  await writeFileContent(ROOT_INSTALL_METADATA_PATH, payload).catch(() => {});
  await writeFileContent(DATA_INSTALL_METADATA_PATH, payload);
}

export function detectInstallKind(metadata: InstallMetadata | null): InstallKind {
  if (process.env.CABINET_INSTALL_KIND === "electron-macos") return "electron-macos";
  if (process.env.CABINET_INSTALL_KIND === "source-managed") return "source-managed";
  if (process.env.CABINET_INSTALL_KIND === "source-custom") return "source-custom";

  if (isElectronRuntime()) return "electron-macos";
  if (metadata?.installKind === "source-managed" && metadata.managed) {
    return "source-managed";
  }
  return "source-custom";
}

export async function listDirtyAppFiles(): Promise<string[]> {
  if (!fsSync.existsSync(path.join(/*turbopackIgnore: true*/ PROJECT_ROOT, ".git"))) {
    return [];
  }

  try {
    const git = simpleGit(PROJECT_ROOT);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return [];

    const status = await git.status();
    return status.files
      .map((entry) => entry.path)
      .filter(
        (filePath) =>
          !APP_PATH_IGNORES.some((prefix) => filePath === prefix.slice(0, -1) || filePath.startsWith(prefix))
      )
      .sort();
  } catch {
    return [];
  }
}

export async function detectInstallState(): Promise<{
  installKind: InstallKind;
  metadata: InstallMetadata | null;
  dirtyAppFiles: string[];
  managed: boolean;
}> {
  const metadata = await readInstallMetadata();
  const installKind = detectInstallKind(metadata);
  const dirtyAppFiles = installKind === "source-managed" ? await listDirtyAppFiles() : [];

  return {
    installKind,
    metadata,
    dirtyAppFiles,
    managed: metadata?.managed === true || installKind === "electron-macos",
  };
}
