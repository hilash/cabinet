import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";

// Reveal a file in the OS file manager, selecting it where the platform supports
// it. Uses spawn() with an argv array (no shell) so filenames can't be interpreted
// as shell syntax.
function getRevealCommand(target: string): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: ["-R", target] };
    case "win32":
      // explorer.exe wants `/select,<path>` as a single token; it also exits with a
      // non-zero code even on success, so we never await/inspect its exit (issue #94 §7).
      return { command: "explorer.exe", args: [`/select,${target}`] };
    default:
      // Linux/other: no portable "reveal & select", so open the containing folder.
      return { command: "xdg-open", args: [path.dirname(target)] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path: filePath } = await req.json();
    if (typeof filePath !== "string" || !filePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const resolved = resolveContentPath(filePath);
    if (!(await fileExists(resolved))) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { command, args } = getRevealCommand(resolved);
    // Detach so the file manager outlives this request; swallow spawn errors
    // (e.g. xdg-open missing) rather than 500-ing a best-effort convenience action.
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
