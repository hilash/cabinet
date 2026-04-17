import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import simpleGit from "simple-git";
import {
  resolveContentPath,
  sanitizeFilename,
} from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists, writeFileContent } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

interface LinkRepoRequest {
  localPath?: string;
  name?: string;
  remote?: string;
  description?: string;
  parentPath?: string;
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export const POST = createHandler({
  handler: async (_input, req) => {
    let symlinkCreated = false;
    let targetDir = "";
    let localPath = "";
    const writtenFiles: string[] = [];

    try {
      const body = (await req.json()) as LinkRepoRequest;
      const localPathInput = body.localPath?.trim();
      if (!localPathInput) {
        throw new HttpError(400, "localPath is required");
      }

      localPath = path.resolve(localPathInput);
      const stat = await fs.stat(localPath).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        throw new HttpError(400, "Local path must be an existing directory.");
      }

      const derivedName = body.name?.trim() || path.basename(localPath);
      const folderName = sanitizeFilename(derivedName);
      if (!folderName) {
        throw new HttpError(400, "A valid repo name is required.");
      }

      const parentPath = body.parentPath?.trim() || "";
      const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName;
      targetDir = resolveContentPath(relativePath);

      // Use lstat to detect both real entries and symlinks (including broken ones)
      const existing = await fs.lstat(targetDir).catch(() => null);
      if (existing) {
        throw new HttpError(
          409,
          `A Knowledge Base folder named "${folderName}" already exists.`
        );
      }

      // If parentPath points to a standalone .md file, promote it to a directory
      if (parentPath) {
        const parentDir = resolveContentPath(parentPath);
        const parentMdFile = `${parentDir}.md`;
        const parentDirExists = await fileExists(parentDir);
        const parentMdExists = !parentDirExists && await fileExists(parentMdFile);
        if (parentMdExists) {
          await fs.mkdir(parentDir, { recursive: true });
          await fs.rename(parentMdFile, path.join(parentDir, "index.md"));
        }
      }

      // Ensure parent directory exists for the symlink
      await ensureDirectory(path.dirname(targetDir));

      const detected = await detectGitMetadata(localPath);
      const isRepo = detected.isRepo || !!body.remote?.trim();
      const branch = detected.branch || "main";
      const remote = body.remote?.trim() || detected.remote;
      const source = remote ? "both" : "local";
      const description = body.description?.trim() || undefined;

      // Write .cabinet.yaml into the target directory
      const cabinetYamlPath = path.join(localPath, ".cabinet.yaml");
      const cabinetMeta = {
        title: derivedName,
        tags: isRepo ? ["repo"] : ["knowledge"],
        created: new Date().toISOString(),
        ...(description ? { description } : {}),
      };
      await writeFileContent(
        cabinetYamlPath,
        yaml.dump(cabinetMeta, { lineWidth: -1, noRefs: true })
      );
      writtenFiles.push(cabinetYamlPath);

      // Write .repo.yaml into the target directory (for git repos, skip if already exists)
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
            yaml.dump(repoConfig, { lineWidth: -1, noRefs: true })
          );
          writtenFiles.push(repoYamlPath);
        }
      }

      // Create direct symlink: data/my-project -> /external/path
      await fs.symlink(
        localPath,
        targetDir,
        process.platform === "win32" ? "junction" : "dir"
      );
      symlinkCreated = true;

      autoCommit(relativePath, "Add");

      return {
        ok: true,
        path: relativePath,
        ...(warning ? { warning } : {}),
      };
    } catch (error) {
      // Clean up on failure: remove symlink and written dotfiles
      if (symlinkCreated && targetDir) {
        await fs.unlink(targetDir).catch(() => {});
      }
      for (const f of writtenFiles) {
        await fs.unlink(f).catch(() => {});
      }

      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
