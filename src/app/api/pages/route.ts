import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { readPage, writePage, createPage } from "@/lib/storage/page-io";
import { fileExists, writeFileContent } from "@/lib/storage/fs-operations";
import { getDataDir } from "@/lib/storage/path-utils";
import { route } from "@/lib/runtime/route-wrapper";
import { autoCommit } from "@/lib/git/git-service";

function rootIndex(): string { return path.join(getDataDir(), "index.md"); }

async function ensureRootIndex() {
  if (!(await fileExists(rootIndex()))) {
    const now = new Date().toISOString();
    await writeFileContent(
      rootIndex(),
      `---\ntitle: Knowledge Base\ncreated: "${now}"\nmodified: "${now}"\ntags: []\n---\n`
    );
  }
}

export const GET = route(async () => {
  try {
    await ensureRootIndex();
    const page = await readPage("");
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

export const POST = route(async (req: NextRequest) => {
  try {
    const body = await req.json();
    await createPage("", body.title);
    autoCommit("", "Add");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

export const PUT = route(async (req: NextRequest) => {
  try {
    const body = await req.json();
    await writePage("", body.content, body.frontmatter);
    autoCommit("", "Update");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
