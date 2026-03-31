import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");

export function resolveContentPath(virtualPath: string): string {
  const resolved = path.resolve(DATA_DIR, virtualPath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function virtualPathFromFs(fsPath: string): string {
  return fsPath.replace(DATA_DIR, "").replace(/^\//, "");
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md");
}

export function isHiddenEntry(name: string): boolean {
  return name.startsWith(".");
}
