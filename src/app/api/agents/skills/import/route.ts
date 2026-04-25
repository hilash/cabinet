import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { readPersona, writePersona } from "@/lib/agents/persona-manager";
import { updateSkillsLock } from "@/lib/agents/skills/lock";
import { parseSource } from "@/lib/agents/skills/import-source";

/**
 * POST /api/agents/skills/import
 * Body: { source, scope?, attachToAgents?, ref? }
 *
 * Source forms accepted:
 *   - "github:owner/repo[/skill]"            → clone skill bundle from GitHub
 *   - "https://skills.sh/owner/repo[/skill]" → resolve to GitHub
 *   - "https://github.com/owner/repo[/...]"  → resolve to GitHub
 *   - "local:/absolute/path"                 → copy from local path (rare)
 *
 * scope: "root" | "cabinet:<path>"  (default: "root")
 * attachToAgents: agent slugs to add the imported skill key to (one-click flow)
 */

interface ImportRequest {
  source: string;
  scope?: string;
  attachToAgents?: string[];
  ref?: string;
}

// `parseSource` and `ResolvedSource` extracted to
// `src/lib/agents/skills/import-source.ts` so they can be unit-tested.

function gitClone(url: string, dest: string, ref?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["clone", "--depth", "1"];
    if (ref) args.push("--branch", ref);
    args.push(url, dest);
    const child = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone failed: ${stderr.trim() || `code ${code}`}`));
    });
  });
}

function resolveDestRoot(scope: string | undefined): string {
  if (!scope || scope === "root" || scope === "cabinet-root") {
    return path.join(PROJECT_ROOT, ".agents", "skills");
  }
  if (scope.startsWith("cabinet:")) {
    const cabinet = scope.slice("cabinet:".length);
    return path.join(DATA_DIR, cabinet, ".agents", "skills");
  }
  return path.join(PROJECT_ROOT, ".agents", "skills");
}

async function attachToAgents(slugs: string[] | undefined, skillKey: string): Promise<string[]> {
  if (!slugs || slugs.length === 0) return [];
  const updated: string[] = [];
  for (const slug of slugs) {
    const persona = await readPersona(slug);
    if (!persona) continue;
    const next = new Set([...(persona.skills || []), skillKey]);
    await writePersona(slug, { skills: Array.from(next) });
    updated.push(slug);
  }
  return updated;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as ImportRequest;
  if (!body.source) {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const parsed = parseSource(body.source);
  if (!parsed) {
    return NextResponse.json(
      { error: `unrecognized source format: ${body.source}` },
      { status: 400 },
    );
  }

  const destRoot = resolveDestRoot(body.scope);
  await fs.mkdir(destRoot, { recursive: true });

  let importedKey: string;
  let sourceLocator: string;
  let sourceType: "github" | "skills_sh" | "local_path";

  if (parsed.kind === "local") {
    if (!parsed.localPath) {
      return NextResponse.json({ error: "local source missing path" }, { status: 400 });
    }
    importedKey = path.basename(parsed.localPath);
    const dest = path.join(destRoot, importedKey);
    await fs.cp(parsed.localPath, dest, { recursive: true });
    sourceLocator = parsed.localPath;
    sourceType = "local_path";
  } else {
    // github / skills_sh — both resolve to a GitHub clone.
    const owner = parsed.owner!;
    const repo = parsed.repo!;
    const url = `https://github.com/${owner}/${repo}.git`;
    const ref = body.ref ?? parsed.ref;

    // Clone to a temp dir, then move/copy the relevant subtree.
    const tmp = await fs.mkdtemp(path.join(destRoot, ".import-"));
    try {
      await gitClone(url, tmp, ref);
      // If skillName specified, copy that subdir; else copy the whole repo's
      // skills/ if present; else copy the repo itself as a single skill.
      let sourceDir: string;
      if (parsed.skillName) {
        // Try repo/<skillName> then repo/skills/<skillName>
        const direct = path.join(tmp, parsed.skillName);
        const nested = path.join(tmp, "skills", parsed.skillName);
        if (await fs.stat(direct).then(() => true).catch(() => false)) {
          sourceDir = direct;
        } else if (await fs.stat(nested).then(() => true).catch(() => false)) {
          sourceDir = nested;
        } else {
          throw new Error(
            `skill "${parsed.skillName}" not found in ${owner}/${repo} (looked in /, /skills/)`,
          );
        }
        importedKey = parsed.skillName;
      } else {
        // No skill name → repo IS the skill (e.g. shadcn/skill-bundle pattern)
        importedKey = repo;
        sourceDir = tmp;
      }
      const dest = path.join(destRoot, importedKey);
      await fs.rm(dest, { recursive: true, force: true });
      await fs.cp(sourceDir, dest, { recursive: true });
      sourceLocator = parsed.skillName
        ? `github:${owner}/${repo}/${parsed.skillName}`
        : `github:${owner}/${repo}`;
      sourceType = parsed.kind === "skills_sh" ? "skills_sh" : "github";
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  }

  // Update lock file with resolved provenance.
  await updateSkillsLock(importedKey, {
    source: sourceLocator,
    sourceType,
    ref: body.ref ?? parsed.ref ?? null,
    scope: body.scope ?? "root",
    installedAt: new Date().toISOString(),
  });

  // Attach to agents if requested.
  const attached = await attachToAgents(body.attachToAgents, importedKey);

  return NextResponse.json({
    ok: true,
    key: importedKey,
    sourceType,
    sourceLocator,
    attachedAgents: attached,
  });
}
