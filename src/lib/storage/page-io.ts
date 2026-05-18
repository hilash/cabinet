import fs from "fs/promises";
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
} from "./fs-operations";
import {
  appendOrder,
  computeInsertOrder,
  removeSidecarEntry,
  setEntryOrder,
} from "./order-store";

function defaultFrontmatter(title: string): FrontMatter {
  const now = new Date().toISOString();
  return { title, created: now, modified: now, tags: [] };
}

type ResolvedPageEntry = {
  fsPath: string;
  virtualName: string;
};

function joinVirtualPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

function isDescendantPath(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function shouldFallbackMove(error: unknown): error is NodeJS.ErrnoException {
  if (!(error instanceof Error)) return false;
  return ["EXDEV", "EPERM", "EACCES"].includes(
    (error as NodeJS.ErrnoException).code ?? ""
  );
}

async function resolveExistingPageEntry(
  virtualPath: string
): Promise<ResolvedPageEntry> {
  const resolved = resolveContentPath(virtualPath);

  if (await fileExists(resolved)) {
    return {
      fsPath: resolved,
      virtualName: path.basename(resolved),
    };
  }

  const mdPath = resolved.endsWith(".md") ? resolved : `${resolved}.md`;
  if (await fileExists(mdPath)) {
    return {
      fsPath: mdPath,
      virtualName: resolved.endsWith(".md")
        ? path.basename(mdPath)
        : path.basename(mdPath, ".md"),
    };
  }

  throw new Error(`Page not found: ${virtualPath}`);
}

async function moveResolvedEntry(
  fromResolved: string,
  toResolved: string
): Promise<void> {
  try {
    await fs.rename(fromResolved, toResolved);
    return;
  } catch (error) {
    if (!shouldFallbackMove(error)) {
      throw error;
    }
  }

  const sourceStat = await fs.lstat(fromResolved);

  if (sourceStat.isSymbolicLink()) {
    const target = await fs.readlink(fromResolved);
    const symlinkTarget = path.isAbsolute(target)
      ? target
      : path.relative(
          path.dirname(toResolved),
          path.resolve(path.dirname(fromResolved), target)
        );
    const targetStat = await fs.stat(fromResolved).catch(() => null);
    const symlinkType = process.platform === "win32"
      ? (targetStat?.isDirectory() ? "junction" : "file")
      : undefined;
    await fs.symlink(symlinkTarget, toResolved, symlinkType);
    await fs.unlink(fromResolved);
    return;
  }

  await fs.cp(fromResolved, toResolved, {
    recursive: sourceStat.isDirectory(),
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });

  if (sourceStat.isDirectory()) {
    await fs.rm(fromResolved, { recursive: true, force: true });
  } else {
    await fs.unlink(fromResolved);
  }
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
    const stat = await fs.stat(resolved);
    if (stat.isFile()) {
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
        dir: data.dir,
        google: data.google,
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

/**
 * Heuristic: if a doc's text is mostly Hebrew letters, return "rtl". Used to
 * auto-set frontmatter.dir on agent-generated notes so they render RTL on
 * load. Examines the first ~600 chars to avoid scanning huge files.
 */
function inferDirFromText(content: string): "rtl" | undefined {
  const sample = content.slice(0, 600);
  // Hebrew block: U+0590–U+05FF. Stop counting at 600 chars sampled.
  const hebrewMatches = sample.match(/[֐-׿]/g);
  const letterMatches = sample.match(/[A-Za-z֐-׿]/g);
  if (!hebrewMatches || !letterMatches) return undefined;
  return hebrewMatches.length / letterMatches.length > 0.5 ? "rtl" : undefined;
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

  // Auto-detect RTL when the writer didn't set `dir` explicitly and the
  // content reads as Hebrew. Saves Hebrew users from manually toggling the
  // editor RTL button on every agent-generated note.
  const effectiveFrontmatter: Partial<FrontMatter> =
    frontmatter.dir === undefined
      ? { ...frontmatter, dir: inferDirFromText(content) }
      : frontmatter;

  // Strip undefined values — js-yaml cannot serialize them
  const fm = Object.fromEntries(
    Object.entries({ ...effectiveFrontmatter, modified: new Date().toISOString() })
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
  const parentVirtual = virtualPath.split("/").slice(0, -1).join("/");
  const order = await appendOrder(parentVirtual);
  const fm: FrontMatter & { order?: number } = {
    ...defaultFrontmatter(title),
    order,
  };
  const output = matter.stringify(`\n# ${title}\n`, fm);
  await writeFileContent(filePath, output);
}

export async function deletePage(virtualPath: string): Promise<void> {
  const resolved = resolveContentPath(virtualPath);
  const stat = await fs.lstat(resolved).catch(() => null);
  if (stat?.isSymbolicLink()) {
    await unlinkSymlink(resolved);
  } else {
    await deleteFileOrDir(resolved);
  }
}

// Hidden dirs scaffolded next to every cabinet (cabinet-scaffold.ts:95-97).
// A "hollow orphan" is a destination that contains only these dirs and they
// in turn hold zero files — the daemon's leftovers from a prior cabinet move,
// not real user content. An empty user-created folder with the same slug as
// the moving item must NOT match (no scaffolding present).
const CABINET_SCAFFOLD_NAMES = new Set([".agents", ".jobs", ".cabinet-state"]);

async function isHollowOrphanDir(dir: string): Promise<boolean> {
  let topEntries;
  try {
    topEntries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  if (topEntries.length === 0) return false;
  for (const e of topEntries) {
    if (!e.isDirectory()) return false;
    if (!CABINET_SCAFFOLD_NAMES.has(e.name)) return false;
  }
  const stack = topEntries.map((e) => path.join(dir, e.name));
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(current, e.name));
      else return false;
    }
  }
  return true;
}

export async function movePage(
  fromPath: string,
  toParentPath: string,
  options: { prevName?: string | null; nextName?: string | null } = {}
): Promise<string> {
  const fromEntry = await resolveExistingPageEntry(fromPath);
  const toDir = toParentPath
    ? resolveContentPath(toParentPath)
    : resolveContentPath("");
  const toResolved = path.join(toDir, path.basename(fromEntry.fsPath));
  const name = fromEntry.virtualName;

  const fromParentVirtual = fromPath.split("/").slice(0, -1).join("/");
  const isReorder = fromEntry.fsPath === toResolved;

  if (!isReorder && isDescendantPath(fromEntry.fsPath, toResolved)) {
    throw new Error("Cannot move a page into itself");
  }

  if (!isReorder) {
    if (await fileExists(toResolved)) {
      // Destination may be empty .agents/ scaffolding the daemon recreated at
      // the old path after a prior cabinet move — sweep it so rename succeeds.
      if (await isHollowOrphanDir(toResolved)) {
        const fsp = await import("fs/promises");
        await fsp.rm(toResolved, { recursive: true, force: true });
      } else {
        throw new Error(
          `An item named "${name}" already exists in ${
            toParentPath ? `"${toParentPath}"` : "the root"
          }. Rename or remove it first.`
        );
      }
    }
    await ensureDirectory(toDir);
    await moveResolvedEntry(fromEntry.fsPath, toResolved);
    await removeSidecarEntry(fromParentVirtual, fromEntry.virtualName).catch(() => {});
  }

  const { prevName, nextName } = options;
  if (prevName !== undefined || nextName !== undefined) {
    const order = await computeInsertOrder(
      toParentPath,
      prevName ?? null,
      nextName ?? null,
      name
    );
    await setEntryOrder(toParentPath, name, order);
  } else if (!isReorder) {
    // Cross-dir move with no neighbors → append at end.
    const order = await appendOrder(toParentPath);
    await setEntryOrder(toParentPath, name, order);
  }

  return joinVirtualPath(toParentPath, fromEntry.virtualName);
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

  const parentVirtual = virtualPath.split("/").slice(0, -1).join("/");
  return parentVirtual ? `${parentVirtual}/${slug}` : slug;
}
