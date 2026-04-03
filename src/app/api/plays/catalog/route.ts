import { NextRequest, NextResponse } from "next/server";
import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  listDirectory,
  readFileContent,
  fileExists,
  ensureDirectory,
} from "@/lib/storage/fs-operations";
import { writePlay, readPlay } from "@/lib/agents/play-manager";
import type { CatalogPlayDefinition } from "@/types/agents";

const CATALOG_DIR = path.join(DATA_DIR, ".playbooks", "catalog");

async function listCatalog(): Promise<CatalogPlayDefinition[]> {
  await ensureDirectory(CATALOG_DIR);
  const entries = await listDirectory(CATALOG_DIR);
  const plays: CatalogPlayDefinition[] = [];

  for (const entry of entries) {
    if (!entry.name.endsWith(".md") || entry.isDirectory) continue;
    const slug = entry.name.replace(/\.md$/, "");
    const filePath = path.join(CATALOG_DIR, entry.name);
    const raw = await readFileContent(filePath);
    const { data, content } = matter(raw);

    plays.push({
      name: (data.name as string) || slug,
      title: (data.title as string) || slug,
      category: (data.category as string) || "general",
      schedule: data.schedule as CatalogPlayDefinition["schedule"],
      triggers: (data.triggers as CatalogPlayDefinition["triggers"]) || [{ type: "manual" }],
      tools: (data.tools as string[]) || undefined,
      timeout: (data.timeout as number) || 300,
      estimated_duration: (data.estimated_duration as string) || undefined,
      integrations: (data.integrations as CatalogPlayDefinition["integrations"]) || [],
      inputs: (data.inputs as CatalogPlayDefinition["inputs"]) || [],
      outputs: (data.outputs as CatalogPlayDefinition["outputs"]) || [],
      slug,
      body: content.trim(),
    });
  }

  return plays;
}

// GET /api/plays/catalog — list all catalog templates
export async function GET() {
  const plays = await listCatalog();
  return NextResponse.json({ plays });
}

// POST /api/plays/catalog — install a catalog play into active plays
export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  // Check if already installed
  const existing = await readPlay(slug);
  if (existing) {
    return NextResponse.json({ error: "Play already installed", slug }, { status: 409 });
  }

  // Read from catalog
  const catalogFile = path.join(CATALOG_DIR, `${slug}.md`);
  if (!(await fileExists(catalogFile))) {
    return NextResponse.json({ error: "Catalog play not found" }, { status: 404 });
  }

  const raw = await readFileContent(catalogFile);
  const { data, content } = matter(raw);

  // Write to active plays (strips catalog-only fields)
  await writePlay(slug, {
    name: (data.name as string) || slug,
    title: (data.title as string) || slug,
    category: (data.category as string) || "general",
    schedule: data.schedule as CatalogPlayDefinition["schedule"],
    triggers: (data.triggers as CatalogPlayDefinition["triggers"]) || [{ type: "manual" }],
    tools: (data.tools as string[]) || [],
    timeout: (data.timeout as number) || 300,
    estimated_duration: (data.estimated_duration as string) || undefined,
    slug,
    body: content.trim(),
  });

  return NextResponse.json({ ok: true, slug });
}
