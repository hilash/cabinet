import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import simpleGit from "simple-git";
import {
  resolveContentPath,
  sanitizeFilename,
} from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  fileExists,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import { HttpError } from "@/lib/http/create-handler";

export interface LinkRepoRequest {
  localPath?: string;
  name?: string;
  remote?: string;
  description?: string;
  parentPath?: string;
}

export interface LinkRepoResult {
  path: string;
  warning?: string;
}

async function detectGitMetadata(localPath: string): Promise<{
  isRepo: boolean;
  branch?: string;
  remote?: string;
}> {
  try {
    const git = simpleGit(localPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return { isRepo: false };

    const branchSummary = await git.branchLocal();
    const remotes = await git.getRemotes(true);
    const preferredRemote =
      remotes.find((remote) => remote.name === "origin") || remotes[0];

    return {
      isRepo: true,
      branch: branchSummary.current || undefined,
      remote:
        preferredRemote?.refs.push ||
        preferredRemote?.refs.fetch ||
        undefined,
    };
  } catch {
    return { isRepo: false };
  }
}

async function isDirectoryPath(absPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(absPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function pathExistsIncludingSymlink(absPath: string): Promise<boolean> {
  try {
    await fs.lstat(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function linkRepoAsKnowledgeFolder(
  request: LinkRepoRequest,
): Promise<LinkRepoResult> {
  let symlinkCreated = false;
  let targetDir = "";
  const writtenFiles: string[] = [];

  try {
    const localPathInput = request.localPath?.trim();
    if (!localPathInput) {
      throw new HttpError(400, "localPath is required");
    }

    const localPath = path.resolve(localPathInput);
    if (!(await isDirectoryPath(localPath))) {
      throw new HttpError(400, "Local path must be an existing directory.");
    }

    const derivedName = request.name?.trim() || path.basename(localPath);
    const folderName = sanitizeFilename(derivedName);
    if (!folderName) {
      throw new HttpError(400, "A valid repo name is required.");
    }

    const parentPath = request.parentPath?.trim() || "";
    const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName;
    targetDir = resolveContentPath(relativePath);

    if (await pathExistsIncludingSymlink(targetDir)) {
      throw new HttpError(
        409,
        `A Knowledge Base folder named "${folderName}" already exists.`,
      );
    }

    if (parentPath) {
      const parentDir = resolveContentPath(parentPath);
      const parentMdFile = `${parentDir}.md`;
      const parentDirExists = await fileExists(parentDir);
      const parentMdExists = !parentDirExists && (await fileExists(parentMdFile));
      if (parentMdExists) {
        await ensureDirectory(parentDir);
        await fs.rename(parentMdFile, path.join(parentDir, "index.md"));
      }
    }

    await ensureDirectory(path.dirname(targetDir));

    const detected = await detectGitMetadata(localPath);
    const isRepo = detected.isRepo || !!request.remote?.trim();
    const branch = detected.branch || "main";
    const remote = request.remote?.trim() || detected.remote;
    const source = remote ? "both" : "local";
    const description = request.description?.trim() || undefined;

    const cabinetYamlPath = path.join(localPath, ".cabinet.yaml");
    const cabinetMeta = {
      title: derivedName,
      tags: isRepo ? ["repo"] : ["knowledge"],
      created: new Date().toISOString(),
      ...(description ? { description } : {}),
    };
    await writeFileContent(
      cabinetYamlPath,
      yaml.dump(cabinetMeta, { lineWidth: -1, noRefs: true }),
    );
    writtenFiles.push(cabinetYamlPath);

    let warning: string | undefined;
    if (isRepo) {
      const repoYamlPath = path.join(localPath, ".repo.yaml");
      if (await fileExists(repoYamlPath)) {
        warning = ".repo.yaml already exists in the target directory — skipped writing.";
      } else {
        const repoConfig = {
          name: derivedName,
          local: localPath,
          ...(remote ? { remote } : {}),
          source,
          branch,
          ...(description ? { description } : {}),
        };
        await writeFileContent(
          repoYamlPath,
          yaml.dump(repoConfig, { lineWidth: -1, noRefs: true }),
        );
        writtenFiles.push(repoYamlPath);
      }
    }

    await fs.symlink(
      localPath,
      targetDir,
      process.platform === "win32" ? "junction" : "dir",
    );
    symlinkCreated = true;

    autoCommit(relativePath, "Add");

    return { path: relativePath, ...(warning ? { warning } : {}) };
  } catch (error) {
    if (symlinkCreated && targetDir) {
      await fs.unlink(targetDir).catch(() => {});
    }
    for (const f of writtenFiles) {
      await fs.unlink(f).catch(() => {});
    }
    throw error;
  }
}
