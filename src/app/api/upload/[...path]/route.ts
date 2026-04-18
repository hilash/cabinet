// fs boundary: consumes multipart/form-data uploads and writes them to the
// filesystem. `createHandler` only parses JSON bodies, so this route stays raw.

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { resolveContentPath } from "@/lib/storage/path-utils";
import { ensureDirectory, fileExists } from "@/lib/storage/fs-operations";
import fs from "fs/promises";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const resolved = resolveContentPath(virtualPath);

    await ensureDirectory(resolved);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    let filePath = path.join(resolved, filename);
    let counter = 1;

    while (await fileExists(filePath)) {
      filename = `${base}-${counter}${ext}`;
      filePath = path.join(resolved, filename);
      counter++;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const mimeType = file.type || "";
    let markdown: string;
    if (mimeType.startsWith("image/")) {
      markdown = `![${file.name}](./${filename})`;
    } else if (mimeType.startsWith("video/")) {
      markdown = `<video src="./${filename}" controls></video>`;
    } else {
      markdown = `[${file.name}](./${filename})`;
    }

    return NextResponse.json({
      ok: true,
      filename,
      markdown,
      url: `/api/assets/${virtualPath}/${filename}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
