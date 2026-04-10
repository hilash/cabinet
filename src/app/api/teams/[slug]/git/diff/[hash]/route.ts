import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

type RouteParams = { params: Promise<{ slug: string; hash: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug, hash } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const diff = await getDiff(hash, dataDir);
    return NextResponse.json({ diff });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
