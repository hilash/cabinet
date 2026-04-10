import { NextRequest, NextResponse } from "next/server";
import { restoreFileFromCommit } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const { hash, pagePath } = await req.json();
    if (!hash || !pagePath) {
      return NextResponse.json({ error: "hash and pagePath are required" }, { status: 400 });
    }

    const candidates = [
      path.join(pagePath, "index.md"),
      `${pagePath}.md`,
    ];

    let restored = false;
    for (const candidate of candidates) {
      restored = await restoreFileFromCommit(hash, candidate, dataDir);
      if (restored) break;
    }

    if (!restored) {
      return NextResponse.json(
        { error: "Failed to restore — file may not exist at that commit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
