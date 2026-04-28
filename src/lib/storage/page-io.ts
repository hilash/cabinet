import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { CABINET_LINK_META_CANDIDATES } from "@/lib/cabinets/files";
import type { PageData, FrontMatter } from "@/types";
import { resolveContentPath } from "./path-utils";
import {
  readFileContent,
  writeFileContent,
  ensureDirectory,
  fileExists,
  deleteFileOrDir,
  unlinkSymlink,
  stat,
  rename,
} from "./fs-operations";

function defaultFrontmatter(title: string): FrontMatter {
  const now = new Date().toISOString();
  return { title, created: now, modified: now, tags: [] };
}

export async function readPage(virtualPath: string): Promise<PageData> {
  const resolved = resolveContentPath(virtualPath);

  // Try directory with index.md first
  const indexPath = path.join(resolved, "index.md");
  const mdPath = resolved.endsWith(".md") ? resolved : `${resolved}.md`;

  let filePath: string | null = null;
  if (await fileExists(indexPath)) {
    filePath = indexPath;
  } else if (await fileExists(mdPath)) {
    filePath = mdPath;
  } else if (await fileExists(resolved)) {
    // Could be a raw file or a directory — check for linked-folder metadata fallback.
    const info = await stat(resolved);
    if (info?.isFile) {
      filePath = resolved;
    }
  }

  if (filePath) {
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

  // Fallback for linked directories without index.md.
  for (const filename of CABINET_LINK_META_CANDIDATES) {
    const cabinetMetaPath = path.join(resolved, filename);
    if (!(await fileExists(cabinetMetaPath))) continue;

    const raw = await readFileContent(cabinetMetaPath);
    const meta = yaml.load(raw) as Record<string, unknown>;
    return {
      path: virtualPath,
      content:
        (meta.description as string) ||
        "This folder is linked from an external directory.",
      frontmatter: {
        title: (meta.title as string) || path.basename(virtualPath),
        created: (meta.created as string) || new Date().toISOString(),
        modified: (meta.created as string) || new Date().toISOString(),
        tags: (meta.tags as string[]) || [],
      },
    };
  }

  throw new Error(`Page not found: ${virtualPath}`);
}

export async function writePage(
  virtualPath: string,
  content: string,
  frontmatter: Partial<FrontMatter>
): Promise<void> {
  const resolved = resolveContentPath(virtualPath);

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
  title: string
): Promise<void> {
  const resolved = resolveContentPath(virtualPath);
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

export async function deletePage(virtualPath: string): Promise<void> {
  const resolved = resolveContentPath(virtualPath);
  const info = await stat(resolved);
  if (info?.isSymlink) {
    await unlinkSymlink(resolved);
  } else {
    await deleteFileOrDir(resolved);
  }
}

export async function movePage(
  fromPath: string,
  toParentPath: string
): Promise<string> {
  const fromResolved = resolveContentPath(fromPath);
  const name = path.basename(fromResolved);
  const toDir = toParentPath
    ? resolveContentPath(toParentPath)
    : resolveContentPath("");
  const toResolved = path.join(toDir, name);

  if (fromResolved === toResolved) return fromPath;
  if (toResolved.startsWith(fromResolved + "/")) {
    throw new Error("Cannot move a page into itself");
  }

  await ensureDirectory(toDir);
  await rename(fromResolved, toResolved);

  return toParentPath ? `${toParentPath}/${name}` : name;
}

export async function renamePage(
  virtualPath: string,
  newName: string
): Promise<string> {
  const fromResolved = resolveContentPath(virtualPath);
  const parentDir = path.dirname(fromResolved);
  const slug = newName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const toResolved = path.join(parentDir, slug);

  if (fromResolved === toResolved) return virtualPath;

  await rename(fromResolved, toResolved);

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

  const parentVirtual = virtualPath.split("/").slice(0, -1).join("/");
  return parentVirtual ? `${parentVirtual}/${slug}` : slug;
}
