import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  cleanNotionExport,
  extractNotionZip,
  countMarkdownFiles,
} from "@/lib/notion/clean-export";
import { importDirectory } from "@/lib/storage/import-folder";

export const dynamic = "force-dynamic";

/**
 * Import a Notion "Markdown & CSV" export into the tree as local Markdown.
 * Takes a JSON `{ source }` — a server-side path to the export `.zip` (chosen
 * via the native file picker, so nothing is uploaded) or an already-extracted
 * folder. Everything lands under a "Notion" folder; returns the page count.
 * ponytail: inherits Import Folder's 500MB / 5000-file cap.
 */
export async function POST(req: NextRequest) {
  // mkdtemp under the OS temp dir; cleaned in `finally`.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cabinet-notion-"));
  const extractRoot = path.join(tmp, "Notion");
  try {
    await fs.mkdir(extractRoot, { recursive: true });

    const body = (await req.json().catch(() => ({}))) as {
      source?: string;
      parentPath?: string;
    };
    const source = body.source?.trim();
    const parentPath = body.parentPath?.trim() || "";
    if (!source) {
      return NextResponse.json({ error: "No file selected." }, { status: 400 });
    }

    if (source.toLowerCase().endsWith(".zip")) {
      const buf = await fs.readFile(source).catch(() => null);
      if (!buf) {
        return NextResponse.json({ error: "Couldn't read that file." }, { status: 400 });
      }
      await extractNotionZip(buf, extractRoot);
    } else {
      // Already-extracted folder — copy in so we don't mutate the original.
      await fs.cp(source, extractRoot, { recursive: true });
    }

    await cleanNotionExport(extractRoot);
    const count = await countMarkdownFiles(extractRoot);
    const { path: imported } = await importDirectory(extractRoot, parentPath, "Notion");
    return NextResponse.json({ ok: true, path: imported, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // JSZip's central-directory error → a friendlier hint than the raw message.
    const friendly = /central directory|corrupted zip|end of/i.test(message)
      ? "That doesn't look like a complete Notion export .zip. Re-download it from Notion (Export → Markdown & CSV) and try again."
      : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
