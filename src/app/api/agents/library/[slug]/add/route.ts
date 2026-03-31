import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";

const LIBRARY_DIR = path.join(DATA_DIR, ".agents", ".library");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const templateDir = path.join(LIBRARY_DIR, slug);
    const targetDir = path.join(AGENTS_DIR, slug);

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

    // Create standard subdirectories
    for (const subdir of ["jobs", "skills", "sessions", "memory"]) {
      await fs.mkdir(path.join(targetDir, subdir), { recursive: true });
    }

    return NextResponse.json({ ok: true, slug }, { status: 201 });
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
