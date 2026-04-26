import type { TreeNode, PageData, FrontMatter } from "@/types";

export async function fetchTree(showHidden = false): Promise<TreeNode[]> {
  const url = showHidden ? "/api/tree?showHidden=1" : "/api/tree";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tree");
  return res.json();
}

export class FetchPageError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FetchPageError";
  }
}

export async function fetchPage(path: string): Promise<PageData> {
  const res = await fetch(`/api/pages/${path}`);
  if (!res.ok) {
    throw new FetchPageError(`Failed to fetch page: ${path}`, res.status);
  }
  return res.json();
}

export async function savePage(
  path: string,
  content: string,
  frontmatter: Partial<FrontMatter>
): Promise<void> {
  const res = await fetch(`/api/pages/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, frontmatter }),
  });
  if (!res.ok) throw new Error(`Failed to save page: ${path}`);
}

export async function createPageApi(
  parentPath: string,
  title: string
): Promise<void> {
  const res = await fetch(`/api/pages/${parentPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create page: ${parentPath}`);
}

export async function deletePageApi(path: string): Promise<void> {
  const res = await fetch(`/api/pages/${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete page: ${path}`);
}

export async function movePageApi(
  fromPath: string,
  toParent: string,
  neighbors: { prevName?: string | null; nextName?: string | null } = {}
): Promise<string> {
  const res = await fetch(`/api/pages/${fromPath}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toParent,
      prevName: neighbors.prevName ?? null,
      nextName: neighbors.nextName ?? null,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Failed to move page${detail}`);
  }
  const data = await res.json();
  return data.newPath;
}

export async function renamePageApi(
  fromPath: string,
  newName: string
): Promise<string> {
  const res = await fetch(`/api/pages/${fromPath}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rename: newName }),
  });
  if (!res.ok) throw new Error(`Failed to rename page: ${fromPath}`);
  const data = await res.json();
  return data.newPath;
}
