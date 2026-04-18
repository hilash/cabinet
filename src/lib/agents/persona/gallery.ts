import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  fileExists,
  listDirectory,
  readFileContent,
  statPath,
} from "@/lib/storage/fs-operations";
import { listPersonas } from "@/lib/agents/persona/persona-manager";

export interface GalleryItem {
  name: string;
  type: "app" | "report" | "data" | "code" | "file";
  agent: string;
  agentEmoji: string;
  agentSlug: string;
  department: string;
  path: string;
  modified: string;
  size?: number;
  preview?: string;
}

function titleCase(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function classifyByExtension(ext: string): GalleryItem["type"] {
  if (ext === ".md") return "report";
  if ([".csv", ".json", ".yaml", ".yml"].includes(ext)) return "data";
  if ([".py", ".js", ".ts", ".sh"].includes(ext)) return "code";
  if (ext === ".html") return "app";
  return "file";
}

function extractPreview(content: string): string {
  return content
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 120);
}

interface PersonaMeta {
  name: string;
  emoji: string;
  slug: string;
  department: string;
}

async function scanWorkspace(
  dir: string,
  meta: PersonaMeta,
  basePath: string,
): Promise<GalleryItem[]> {
  const items: GalleryItem[] = [];
  let entries;
  try {
    entries = await listDirectory(dir);
  } catch {
    return items;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".gitkeep") continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(basePath, entry.name);

    if (entry.isDirectory) {
      const hasHtml = await fileExists(path.join(fullPath, "index.html"));
      const hasApp = await fileExists(path.join(fullPath, ".app"));

      if (hasHtml) {
        const stat = await statPath(fullPath);
        if (!stat) continue;
        items.push({
          name: titleCase(entry.name),
          type: "app",
          agent: meta.name,
          agentEmoji: meta.emoji,
          agentSlug: meta.slug,
          department: meta.department,
          path: relPath,
          modified: stat.modifiedIso,
          preview: hasApp ? "Full-screen interactive app" : "Embedded web app",
        });
        continue;
      }

      const indexMdPath = path.join(fullPath, "index.md");
      if (await fileExists(indexMdPath)) {
        const stat = await statPath(indexMdPath);
        if (!stat) continue;
        const raw = await readFileContent(indexMdPath);
        const { data: fm, content: bodyContent } = matter(raw);
        const title = (fm.title as string) || titleCase(entry.name);
        items.push({
          name: title,
          type: "report",
          agent: meta.name,
          agentEmoji: meta.emoji,
          agentSlug: meta.slug,
          department: meta.department,
          path: relPath,
          modified: stat.modifiedIso,
          preview: extractPreview(bodyContent) || "Report",
        });
        continue;
      }

      const subItems = await scanWorkspace(fullPath, meta, relPath);
      items.push(...subItems);
      continue;
    }

    const stat = await statPath(fullPath);
    if (!stat || stat.size < 10) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const type = classifyByExtension(ext);

    let preview: string | undefined;
    let displayName = entry.name;
    if (type === "report" && ext === ".md") {
      try {
        const raw = await readFileContent(fullPath);
        const { data: fm, content: bodyContent } = matter(raw);
        if (fm.title) displayName = fm.title as string;
        preview = extractPreview(bodyContent);
      } catch {
        // ignore malformed frontmatter
      }
    }

    items.push({
      name: displayName,
      type,
      agent: meta.name,
      agentEmoji: meta.emoji,
      agentSlug: meta.slug,
      department: meta.department,
      path: relPath,
      modified: stat.modifiedIso,
      size: stat.size,
      preview,
    });
  }

  return items;
}

export async function listGalleryItems(): Promise<GalleryItem[]> {
  try {
    const personas = await listPersonas();
    const allItems: GalleryItem[] = [];

    for (const persona of personas) {
      if (persona.slug === "editor") continue;

      const workspaceDir = path.join(DATA_DIR, ".agents", persona.slug, "workspace");
      const basePath = `.agents/${persona.slug}/workspace`;
      const items = await scanWorkspace(
        workspaceDir,
        {
          name: persona.name,
          emoji: persona.emoji || "🤖",
          slug: persona.slug,
          department: persona.department || "general",
        },
        basePath,
      );
      allItems.push(...items);
    }

    allItems.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    return allItems;
  } catch {
    return [];
  }
}
