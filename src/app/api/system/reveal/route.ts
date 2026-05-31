import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { fileExists } from "@/lib/storage/fs-operations";

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

    // macOS: reveal in Finder. On other platforms this is a no-op.
    if (process.platform === "darwin") {
      exec(`open -R "${resolved}"`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
