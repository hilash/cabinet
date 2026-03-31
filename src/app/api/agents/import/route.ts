import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { writePersona } from "@/lib/agents/persona-manager";

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* exists */ }
}

export async function POST(req: NextRequest) {
  try {
    const bundle = await req.json();

    if (!bundle.agent?.slug || !bundle.agent?.frontmatter) {
      return NextResponse.json({ error: "Invalid bundle format" }, { status: 400 });
    }

    // Check if slug already exists, generate unique name if needed
    let slug = bundle.agent.slug;
    const agentFile = path.join(DATA_DIR, ".agents", `${slug}.md`);
    try {
      await fs.access(agentFile);
      // File exists, add suffix
      slug = `${slug}-imported-${Date.now().toString(36).slice(-4)}`;
    } catch { /* doesn't exist, use original slug */ }

    // Write agent persona
    const fm = bundle.agent.frontmatter;
    fm.active = false; // Always start paused for safety
    await writePersona(slug, {
      name: fm.name || slug,
      role: fm.role || "",
      provider: fm.provider || "claude-code",
      heartbeat: fm.heartbeat || "0 8 * * *",
      budget: fm.budget || 100,
      active: false,
      workdir: fm.workdir || "/data",
      focus: fm.focus || [],
      tags: fm.tags || [],
      emoji: fm.emoji || "🤖",
      department: fm.department || "general",
      type: fm.type || "specialist",
      goals: fm.goals || [],
      plays: fm.plays || [],
      channels: fm.channels || ["general"],
      workspace: fm.workspace || "workspace",
      slug,
      body: bundle.agent.body || "",
    });

    // Write play files if they don't already exist
    const playsDir = path.join(DATA_DIR, ".playbooks", "plays");
    await ensureDir(playsDir);
    for (const [playSlug, playContent] of Object.entries(bundle.plays || {})) {
      const playFile = path.join(playsDir, `${playSlug}.md`);
      try {
        await fs.access(playFile);
        // Play already exists, skip
      } catch {
        await fs.writeFile(playFile, playContent as string, "utf-8");
      }
    }

    // Create workspace directory structure
    const workspaceDir = path.join(DATA_DIR, ".agents", slug, "workspace");
    await ensureDir(workspaceDir);

    if (bundle.workspaceIndex) {
      // Update title in workspace index to reflect new agent name
      const { data: wsFm, content: wsBody } = matter(bundle.workspaceIndex);
      wsFm.title = `${fm.name || slug} — Workspace`;
      const newWsContent = matter.stringify(wsBody, wsFm);
      await fs.writeFile(path.join(workspaceDir, "index.md"), newWsContent, "utf-8");
    }

    // Create memory and sessions directories
    await ensureDir(path.join(DATA_DIR, ".agents", ".memory", slug));
    await ensureDir(path.join(DATA_DIR, ".agents", slug, "workspace", "reports"));
    await ensureDir(path.join(DATA_DIR, ".agents", slug, "workspace", "data"));

    return NextResponse.json({
      success: true,
      slug,
      message: `Agent "${fm.name || slug}" imported successfully (paused by default).`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Import failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
