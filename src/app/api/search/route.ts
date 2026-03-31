import { NextRequest, NextResponse } from "next/server";
import path from "path";
import matter from "gray-matter";
import { DATA_DIR, isHiddenEntry } from "@/lib/storage/path-utils";
import { listDirectory, readFileContent, fileExists } from "@/lib/storage/fs-operations";

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  tags: string[];
  modified?: string;
}

interface SearchOptions {
  query: string;
  tag?: string;
}

async function collectPages(
  dirPath: string,
  opts: SearchOptions,
  results: SearchResult[]
) {
  const entries = await listDirectory(dirPath);
  const lowerQuery = opts.query.toLowerCase();

  for (const entry of entries) {
    if (isHiddenEntry(entry.name)) continue;
    if (entry.name === "CLAUDE.md") continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory) {
      const indexMd = path.join(fullPath, "index.md");
      if (await fileExists(indexMd)) {
        const raw = await readFileContent(indexMd);
        const { data, content } = matter(raw);
        const title = (data.title as string) || entry.name;
        const tags = (data.tags as string[]) || [];
        const modified = data.modified as string | undefined;

        // Tag filter
        if (opts.tag && !tags.some((t) => t.toLowerCase() === opts.tag!.toLowerCase())) {
          // Still recurse into children
          await collectPages(fullPath, opts, results);
          continue;
        }

        const matches =
          !opts.query ||
          title.toLowerCase().includes(lowerQuery) ||
          content.toLowerCase().includes(lowerQuery) ||
          tags.some((t) => t.toLowerCase().includes(lowerQuery));

        if (matches) {
          const vPath = fullPath.replace(DATA_DIR + "/", "");
          const snippet = opts.query
            ? extractSnippet(content, lowerQuery)
            : content.slice(0, 120).trim() + "...";
          results.push({ path: vPath, title, snippet, tags, modified });
        }
      }
      await collectPages(fullPath, opts, results);
    } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
      const raw = await readFileContent(fullPath);
      const { data, content } = matter(raw);
      const title = (data.title as string) || entry.name.replace(/\.md$/, "");
      const tags = (data.tags as string[]) || [];
      const modified = data.modified as string | undefined;

      if (opts.tag && !tags.some((t) => t.toLowerCase() === opts.tag!.toLowerCase())) {
        continue;
      }

      const matches =
        !opts.query ||
        title.toLowerCase().includes(lowerQuery) ||
        content.toLowerCase().includes(lowerQuery) ||
        tags.some((t) => t.toLowerCase().includes(lowerQuery));

      if (matches) {
        const vPath = fullPath
          .replace(DATA_DIR + "/", "")
          .replace(/\.md$/, "");
        const snippet = opts.query
          ? extractSnippet(content, lowerQuery)
          : content.slice(0, 120).trim() + "...";
        results.push({ path: vPath, title, snippet, tags, modified });
      }
    }
  }
}

function extractSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return content.slice(0, 120).trim() + "...";

  const start = Math.max(0, idx - 50);
  const end = Math.min(content.length, idx + query.length + 70);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet += "...";
  return snippet;
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const tag = req.nextUrl.searchParams.get("tag")?.trim() || undefined;

    if (!q && !tag) {
      return NextResponse.json([]);
    }

    const results: SearchResult[] = [];
    await collectPages(DATA_DIR, { query: q, tag }, results);

    return NextResponse.json(results.slice(0, 20));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
