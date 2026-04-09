import type { TreeNode, PageData, FrontMatter } from "@/types";

/** Build a base URL for a team-scoped route, or fall back to legacy route. */
function teamBase(teamSlug?: string | null, resource?: string): string {
  if (teamSlug) return `/api/teams/${teamSlug}${resource ? `/${resource}` : ""}`;
  return resource ? `/api/${resource}` : "/api";
}

export async function fetchTree(teamSlug?: string | null): Promise<TreeNode[]> {
  const res = await fetch(`${teamBase(teamSlug, "tree")}`);
  if (!res.ok) throw new Error("Failed to fetch tree");
  return res.json();
}

export async function fetchPage(path: string, teamSlug?: string | null): Promise<PageData> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch page: ${path}`);
  return res.json();
}

export async function savePage(
  path: string,
  content: string,
  frontmatter: Partial<FrontMatter>,
  teamSlug?: string | null
): Promise<void> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, frontmatter }),
  });
  if (!res.ok) throw new Error(`Failed to save page: ${path}`);
}

export async function createPageApi(
  parentPath: string,
  title: string,
  teamSlug?: string | null
): Promise<void> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${parentPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create page: ${parentPath}`);
}

export async function deletePageApi(path: string, teamSlug?: string | null): Promise<void> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete page: ${path}`);
}

export async function movePageApi(
  fromPath: string,
  toParent: string,
  teamSlug?: string | null
): Promise<string> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${fromPath}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toParent }),
  });
  if (!res.ok) throw new Error(`Failed to move page: ${fromPath}`);
  const data = await res.json();
  return data.newPath;
}

export async function renamePageApi(
  fromPath: string,
  newName: string,
  teamSlug?: string | null
): Promise<string> {
  const res = await fetch(`${teamBase(teamSlug, "pages")}/${fromPath}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rename: newName }),
  });
  if (!res.ok) throw new Error(`Failed to rename page: ${fromPath}`);
  const data = await res.json();
  return data.newPath;
}

export async function fetchUserTeams(): Promise<
  { id: string; name: string; slug: string; role: string }[]
> {
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Failed to fetch teams");
  const data = await res.json();
  return data.teams ?? [];
}
