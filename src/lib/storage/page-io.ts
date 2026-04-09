import path from "path";
import matter from "gray-matter";
import type { PageData, FrontMatter } from "@/types";
import { resolveContentPath, virtualPathFromFs } from "./path-utils";
import {
  readFileContent,
  writeFileContent,
  ensureDirectory,
  fileExists,
  deleteFileOrDir,
} from "./fs-operations";

function defaultFrontmatter(title: string): FrontMatter {
  const now = new Date().toISOString();
  return { title, created: now, modified: now, tags: [] };
}

export async function readPage(virtualPath: string, dataDir?: string): Promise<PageData> {
  const resolved = resolveContentPath(virtualPath, dataDir);

  // Try directory with index.md first
  const indexPath = path.join(resolved, "index.md");
  const mdPath = resolved.endsWith(".md") ? resolved : `${resolved}.md`;

  let filePath: string;
  if (await fileExists(indexPath)) {
    filePath = indexPath;
  } else if (await fileExists(mdPath)) {
    filePath = mdPath;
  } else if (await fileExists(resolved)) {
    filePath = resolved;
  } else {
    throw new Error(`Page not found: ${virtualPath}`);
  }

  const raw = await readFileContent(filePath);
  const { data, content } = matter(raw);

  return {
    path: virtualPath,
    content: content.trim(),
    frontmatter: {
      title: data.title || path.basename(virtualPath, ".md"),
      created: data.created || new Date().toISOString(),
      modified: data.modified || new Date().toISOString(),
      tags: data.tags || [],
      icon: data.icon,
      order: data.order,
    },
  };
}

export async function writePage(
  virtualPath: string,
  content: string,
  frontmatter: Partial<FrontMatter>,
  dataDir?: string
): Promise<void> {
  const resolved = resolveContentPath(virtualPath, dataDir);

  const indexPath = path.join(resolved, "index.md");
  const mdPath = resolved.endsWith(".md") ? resolved : `${resolved}.md`;

  let filePath: string;
  if (await fileExists(indexPath)) {
    filePath = indexPath;
  } else if (await fileExists(mdPath)) {
    filePath = mdPath;
  } else if (await fileExists(resolved)) {
    filePath = resolved;
  } else {
    // Default: if virtual path looks like a directory, use index.md
    filePath = indexPath;
  }

  // Strip undefined values — js-yaml cannot serialize them
  const fm = Object.fromEntries(
    Object.entries({ ...frontmatter, modified: new Date().toISOString() })
      .filter(([, v]) => v !== undefined)
  );
  const output = matter.stringify(content, fm);
  await ensureDirectory(path.dirname(filePath));
  await writeFileContent(filePath, output);
}

export async function createPage(
  virtualPath: string,
  title: string,
  dataDir?: string
): Promise<void> {
  const resolved = resolveContentPath(virtualPath, dataDir);
  const dirPath = resolved;
  const filePath = path.join(dirPath, "index.md");

  if (await fileExists(filePath)) {
    throw new Error(`Page already exists: ${virtualPath}`);
  }

  await ensureDirectory(dirPath);
  const fm = defaultFrontmatter(title);
  const output = matter.stringify(`\n# ${title}\n`, fm);
  await writeFileContent(filePath, output);
}

export async function deletePage(virtualPath: string, dataDir?: string): Promise<void> {
  const resolved = resolveContentPath(virtualPath, dataDir);
  await deleteFileOrDir(resolved);
}

export async function movePage(
  fromPath: string,
  toParentPath: string,
  dataDir?: string
): Promise<string> {
  const fromResolved = resolveContentPath(fromPath, dataDir);
  const name = path.basename(fromResolved);
  const toDir = toParentPath
    ? resolveContentPath(toParentPath, dataDir)
    : resolveContentPath("", dataDir);
  const toResolved = path.join(toDir, name);

  if (fromResolved === toResolved) return fromPath;
  if (toResolved.startsWith(fromResolved + "/")) {
    throw new Error("Cannot move a page into itself");
  }

  await ensureDirectory(toDir);
  const fs = await import("fs/promises");
  await fs.rename(fromResolved, toResolved);

  const newVirtualPath = virtualPathFromFs(toResolved, dataDir);
  return newVirtualPath;
}

export async function renamePage(
  virtualPath: string,
  newName: string,
  dataDir?: string
): Promise<string> {
  const fromResolved = resolveContentPath(virtualPath, dataDir);
  const parentDir = path.dirname(fromResolved);
  const slug = newName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const toResolved = path.join(parentDir, slug);

  if (fromResolved === toResolved) return virtualPath;

  const fs = await import("fs/promises");
  await fs.rename(fromResolved, toResolved);

  // Update frontmatter title
  const indexMd = path.join(toResolved, "index.md");
  if (await fileExists(indexMd)) {
    const raw = await readFileContent(indexMd);
    const { data, content } = matter(raw);
    data.title = newName;
    data.modified = new Date().toISOString();
    const fm = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    const output = matter.stringify(content, fm);
    await writeFileContent(indexMd, output);
  }

  return virtualPathFromFs(toResolved, dataDir);
}
