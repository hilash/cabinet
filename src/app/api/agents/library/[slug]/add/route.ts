import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { ensureAgentScaffold } from "@/lib/agents/scaffold";
import { createHandler, HttpError } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

const LIBRARY_DIR = path.join(DATA_DIR, ".agents", ".library");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createHandler({
    handler: async () => {
      assertValidSlug(slug);
      const templateDir = path.join(LIBRARY_DIR, slug);
      const targetDir = path.join(AGENTS_DIR, slug);

      const personaPath = path.join(templateDir, "persona.md");
      try {
        await fs.access(personaPath);
      } catch {
        throw new HttpError(404, `Template "${slug}" not found`);
      }

      try {
        await fs.access(targetDir);
        throw new HttpError(409, `Agent "${slug}" already exists`);
      } catch (err) {
        if (err instanceof HttpError) throw err;
      }

      await copyDir(templateDir, targetDir);
      await ensureAgentScaffold(targetDir);

      return { ok: true, slug };
    },
  })(req);
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
