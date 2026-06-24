import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/storage/path-utils";

export const dynamic = "force-dynamic";

// Tree node paths for Markdown pages drop the `.md` extension (see
// tree-builder: `path: vPath.replace(/\.md$/, "")`), so the virtual path
// often has no matching file on disk. Map it back to the real entry —
// `<page>.md`, or `<page>/index.md` for container pages — so `open -R`
// has something to reveal. Falls back to the original path (and finally
// its parent) so directories and real-extension files keep working.
function resolveOnDisk(resolved: string): string {
  if (existsSync(resolved)) return resolved;
  const withMd = `${resolved}.md`;
  if (existsSync(withMd)) return withMd;
  const indexMd = path.join(resolved, "index.md");
  if (existsSync(indexMd)) return indexMd;
  const parent = path.dirname(resolved);
  if (existsSync(parent)) return parent;
  return resolved;
}

function getOpenCommand(targetPath: string, reveal?: boolean): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return reveal
        ? { command: "open", args: ["-R", targetPath] }
        : { command: "open", args: [targetPath] };
    case "win32":
      return reveal
        ? { command: "explorer.exe", args: ["/select,", targetPath] }
        : { command: "explorer.exe", args: [targetPath] };
    default:
      return { command: "xdg-open", args: [targetPath] };
  }
}

export async function POST(request: Request) {
  try {
    let targetPath = DATA_DIR;

    // Optional subpath to open a specific item
    const body = await request.json().catch(() => null);
    if (body?.subpath) {
      const resolved = path.resolve(DATA_DIR, body.subpath);
      if (resolved !== DATA_DIR && !resolved.startsWith(DATA_DIR + path.sep)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      targetPath = resolveOnDisk(resolved);
    }

    // Reveal in Finder when opening a specific subpath
    const { command, args } = getOpenCommand(targetPath, !!body?.subpath);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: "ignore",
      });

      proc.on("error", (error) => {
        reject(error);
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Command exited with code ${code}`));
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
