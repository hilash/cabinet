import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { readPersona } from "@/lib/agents/persona-manager";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const persona = await readPersona(slug);
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read the raw agent markdown file
  const agentFile = path.join(DATA_DIR, ".agents", `${slug}.md`);
  let agentMd = "";
  try {
    agentMd = await fs.readFile(agentFile, "utf-8");
  } catch {
    return NextResponse.json({ error: "Agent file not found" }, { status: 404 });
  }

  // Parse frontmatter to get clean config
  const { data: frontmatter, content: body } = matter(agentMd);

  // Read assigned play definitions
  const plays: Record<string, string> = {};
  const playsDir = path.join(DATA_DIR, ".playbooks", "plays");
  for (const playSlug of persona.plays || []) {
    const playFile = path.join(playsDir, `${playSlug}.md`);
    try {
      const playContent = await fs.readFile(playFile, "utf-8");
      plays[playSlug] = playContent;
    } catch { /* play file may not exist */ }
  }

  // Read workspace index.md if exists
  let workspaceIndex: string | null = null;
  const wsIndexPath = path.join(DATA_DIR, ".agents", slug, "workspace", "index.md");
  try {
    workspaceIndex = await fs.readFile(wsIndexPath, "utf-8");
  } catch { /* no workspace */ }

  // Build export bundle
  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    agent: {
      slug,
      frontmatter,
      body: body.trim(),
    },
    plays,
    workspaceIndex,
  };

  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="${slug}-agent-bundle.json"`,
    },
  });
}
