import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import simpleGit from "simple-git";
import { NextRequest, NextResponse } from "next/server";
import {
  DATA_DIR,
  sanitizeFilename,
} from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists, writeFileContent } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import { getTeamDataDir } from "@/lib/teams/team-fs";

export const dynamic = "force-dynamic";

interface LinkRepoRequest {
  localPath?: string;
  name?: string;
  remote?: string;
  description?: string;
  teamSlug?: string;
}

async function detectGitMetadata(localPath: string): Promise<{
  branch?: string;
  remote?: string;
}> {
  try {
    const git = simpleGit(localPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return {};

    const branchSummary = await git.branchLocal();
    const remotes = await git.getRemotes(true);
    const preferredRemote =
      remotes.find((remote) => remote.name === "origin") || remotes[0];

    return {
      branch: branchSummary.current || undefined,
      remote:
        preferredRemote?.refs.push ||
        preferredRemote?.refs.fetch ||
        undefined,
    };
  } catch {
    return {};
  }
}

function buildIndexContent({
  name,
  localPath,
  remote,
  branch,
  source,
  description,
}: {
  name: string;
  localPath: string;
  remote?: string;
  branch: string;
  source: "local" | "both";
  description?: string;
}) {
  const frontmatter = {
    title: name,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tags: ["repo"],
  };

  const lines = [
    `# ${name}`,
    "",
    description || "This KB folder links to an external code repository.",
    "",
    `- Local path: \`${localPath}\``,
    remote ? `- Remote: \`${remote}\`` : "- Remote: not detected",
    `- Branch: \`${branch}\``,
    `- Source: \`${source}\``,
    "",
    "Cabinet also created a visible `source` symlink in this folder for local access.",
    "Edit `.repo.yaml` if you want to customize the linked repository metadata.",
  ];

  return matter.stringify(`\n${lines.join("\n")}\n`, frontmatter);
}

export async function POST(req: NextRequest) {
  let targetDir = "";

  try {
    const body = (await req.json()) as LinkRepoRequest;
    const localPathInput = body.localPath?.trim();
    if (!localPathInput) {
      return NextResponse.json(
        { error: "localPath is required" },
        { status: 400 }
      );
    }

    const localPath = path.resolve(localPathInput);
    const stat = await fs.stat(localPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json(
        { error: "Local path must be an existing directory." },
        { status: 400 }
      );
    }

    const derivedName = body.name?.trim() || path.basename(localPath);
    const folderName = sanitizeFilename(derivedName);
    if (!folderName) {
      return NextResponse.json(
        { error: "A valid repo name is required." },
        { status: 400 }
      );
    }

    const rootDir = body.teamSlug ? getTeamDataDir(body.teamSlug) : DATA_DIR;
    targetDir = path.join(rootDir, folderName);
    if (!targetDir.startsWith(rootDir + path.sep)) {
      return NextResponse.json({ error: "Invalid folder name." }, { status: 400 });
    }
    if (await fileExists(targetDir)) {
      return NextResponse.json(
        { error: `A Knowledge Base folder named "${folderName}" already exists.` },
        { status: 409 }
      );
    }

    const detected = await detectGitMetadata(localPath);
    const branch = detected.branch || "main";
    const remote = body.remote?.trim() || detected.remote;
    const source = remote ? "both" : "local";
    const description = body.description?.trim() || undefined;

    await ensureDirectory(targetDir);

    const indexPath = path.join(targetDir, "index.md");
    const repoYamlPath = path.join(targetDir, ".repo.yaml");
    const symlinkPath = path.join(targetDir, "source");

    const repoConfig = {
      name: derivedName,
      local: localPath,
      ...(remote ? { remote } : {}),
      source,
      branch,
      ...(description ? { description } : {}),
    };

    await writeFileContent(
      indexPath,
      buildIndexContent({
        name: derivedName,
        localPath,
        remote,
        branch,
        source,
        description,
      })
    );

    await writeFileContent(
      repoYamlPath,
      yaml.dump(repoConfig, { lineWidth: -1, noRefs: true })
    );

    await fs.symlink(
      localPath,
      symlinkPath,
      process.platform === "win32" ? "junction" : "dir"
    );

    autoCommit(folderName, "Add", rootDir);

    return NextResponse.json({
      ok: true,
      path: folderName,
    });
  } catch (error) {
    if (targetDir) {
      await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {});
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
