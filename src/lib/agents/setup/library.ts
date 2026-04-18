import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  copyDirectoryRecursive,
  fileExists,
  listDirectory,
  readFileContent,
} from "@/lib/storage/fs-operations";
import { HttpError } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";
import { ensureAgentScaffold } from "@/lib/agents/persona/scaffold";

const LIBRARY_DIR = path.join(DATA_DIR, ".agents", ".library");
const AGENTS_DIR = path.join(DATA_DIR, ".agents");

export interface LibraryTemplate {
  slug: string;
  name: string;
  emoji: string;
  type: string;
  department: string;
  role: string;
  description: string;
}

export async function listLibraryTemplates(): Promise<LibraryTemplate[]> {
  let entries;
  try {
    entries = await listDirectory(LIBRARY_DIR);
  } catch {
    return [];
  }

  const templates: LibraryTemplate[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const personaPath = path.join(LIBRARY_DIR, entry.name, "persona.md");
    try {
      const raw = await readFileContent(personaPath);
      const { data, content } = matter(raw);
      templates.push({
        slug: data.slug || entry.name,
        name: data.name || entry.name,
        emoji: data.emoji || "",
        type: data.type || "specialist",
        department: data.department || "general",
        role: data.role || "",
        description: content.trim().split("\n\n")[1] || "",
      });
    } catch {
      // Skip templates without valid persona.md
    }
  }

  return templates;
}

export async function instantiateFromLibrary(slug: string): Promise<void> {
  assertValidSlug(slug);
  const templateDir = path.join(LIBRARY_DIR, slug);
  const targetDir = path.join(AGENTS_DIR, slug);

  if (!(await fileExists(path.join(templateDir, "persona.md")))) {
    throw new HttpError(404, `Template "${slug}" not found`);
  }

  if (await fileExists(targetDir)) {
    throw new HttpError(409, `Agent "${slug}" already exists`);
  }

  await copyDirectoryRecursive(templateDir, targetDir);
  await ensureAgentScaffold(targetDir);
}
