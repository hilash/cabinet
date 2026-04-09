import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/storage/path-utils";

export const dynamic = "force-dynamic";

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
      if (!resolved.startsWith(DATA_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      targetPath = resolved;
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
