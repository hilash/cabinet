import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import { ensureAgentScaffold } from "@/lib/agents/scaffold";
import { normalizeCabinetPath } from "@/lib/cabinets/paths";
import { resolveCabinetDir } from "@/lib/cabinets/server-paths";

const LIBRARY_DIR = path.join(PROJECT_ROOT, "src", "lib", "agents", "library");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const cabinetPath = normalizeCabinetPath(
      typeof body.cabinetPath === "string" ? body.cabinetPath : undefined,
      true
    );
    const templateDir = path.join(LIBRARY_DIR, slug);
    const targetDir = path.join(resolveCabinetDir(cabinetPath), ".agents", slug);

    // Verify template exists
    const personaPath = path.join(templateDir, "persona.md");
    try {
      await fs.access(personaPath);
    } catch {
      return NextResponse.json(
        { error: `Template "${slug}" not found` },
        { status: 404 }
      );
    }

    // Check if agent already exists
    try {
      await fs.access(targetDir);
      return NextResponse.json(
        { error: `Agent "${slug}" already exists` },
        { status: 409 }
      );
    } catch {
      // Good — doesn't exist yet
    }

    // Copy template directory to active agents
    await copyDir(templateDir, targetDir);

    await ensureAgentScaffold(targetDir);

    return NextResponse.json({ ok: true, slug, cabinetPath }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
