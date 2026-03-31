import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { readPersona } from "@/lib/agents/persona-manager";

type RouteParams = { params: Promise<{ slug: string }> };

async function scanDir(dir: string, basePath: string): Promise<Array<{ path: string; name: string; modified: string }>> {
  const results: Array<{ path: string; name: string; modified: string }> = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(DATA_DIR, fullPath);
      if (entry.isDirectory()) {
        const sub = await scanDir(fullPath, basePath);
        results.push(...sub);
      } else {
        const stat = await fs.stat(fullPath);
        results.push({
          path: relPath,
          name: entry.name,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  } catch { /* dir doesn't exist */ }
  return results;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const persona = await readPersona(slug);
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allFiles: Array<{ path: string; name: string; modified: string }> = [];

  // 1. Scan agent's private workspace
  const workspaceDir = path.join(DATA_DIR, ".agents", slug, "workspace");
  const workspaceFiles = await scanDir(workspaceDir, workspaceDir);
  allFiles.push(...workspaceFiles);

  // 2. Scan agent's output_dir (KB department folder) if configured
  const outputDir = (persona as unknown as Record<string, unknown>).output_dir as string | undefined;
  if (outputDir) {
    const resolvedDir = path.resolve(DATA_DIR, outputDir.replace(/^\/data\//, ""));
    // Safety: must be under DATA_DIR
    if (resolvedDir.startsWith(DATA_DIR)) {
      const outputFiles = await scanDir(resolvedDir, resolvedDir);
      allFiles.push(...outputFiles);
    }
  }

  // Sort by modified date, newest first
  allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  return NextResponse.json({
    files: allFiles,
    outputDir: outputDir || null,
  });
}
