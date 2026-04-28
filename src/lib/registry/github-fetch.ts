import path from "path";
import { ensureDirectory, writeBinary } from "@/lib/storage/fs-operations";

const REPO_OWNER = "hilash";
const REPO_NAME = "cabinets";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/HEAD`;

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

interface TreeResponse {
  tree: TreeEntry[];
  truncated: boolean;
}

async function ghFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Cabinet-App",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

/**
 * Fetch the full recursive tree for the repo in a single API call,
 * then filter to the requested slug prefix.
 * Downloads files via raw.githubusercontent.com (no API rate limit).
 */
export async function downloadRegistryTemplate(
  slug: string,
  targetDir: string
): Promise<void> {
  // 1. Get the full repo tree in one API call
  const treeRes = await ghFetch(`${API_BASE}/git/trees/HEAD?recursive=1`);
  if (!treeRes.ok) {
    throw new Error(`GitHub API error ${treeRes.status}: failed to fetch repo tree`);
  }
  const treeData = (await treeRes.json()) as TreeResponse;

  const prefix = `${slug}/`;
  const files = treeData.tree.filter(
    (e) => e.type === "blob" && e.path.startsWith(prefix)
  );

  if (files.length === 0) {
    throw new Error(`Template "${slug}" not found in registry`);
  }

  // 2. For each file, download from raw.githubusercontent.com and write through the storage adapter
  await ensureDirectory(targetDir);

  for (const entry of files) {
    // Relative path within the template (strip the slug/ prefix)
    const relPath = entry.path.slice(prefix.length);
    const localPath = path.join(targetDir, relPath);

    // Ensure parent directory exists
    await ensureDirectory(path.dirname(localPath));

    const rawUrl = `${RAW_BASE}/${encodeURIComponent(slug)}/${relPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const fileRes = await fetch(rawUrl);
    if (!fileRes.ok) {
      throw new Error(`Download failed (${fileRes.status}): ${entry.path}`);
    }

    // Write as buffer to handle binary files (images, etc.)
    const buf = Buffer.from(await fileRes.arrayBuffer());
    await writeBinary(localPath, buf);
  }
}
