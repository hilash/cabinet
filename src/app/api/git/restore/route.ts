import { NextRequest, NextResponse } from "next/server";
import { restoreFileFromCommit } from "@/lib/git/git-service";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { hash, pagePath } = await req.json();
    if (!hash || !pagePath) {
      return NextResponse.json(
        { error: "hash and pagePath are required" },
        { status: 400 }
      );
    }

    // Try both directory index.md and standalone .md
    const candidates = [
      path.join(pagePath, "index.md"),
      `${pagePath}.md`,
    ];

    let restored = false;
    for (const candidate of candidates) {
      restored = await restoreFileFromCommit(hash, candidate);
      if (restored) break;
    }

    if (!restored) {
      return NextResponse.json(
        { error: "Failed to restore — file may not exist at that commit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
