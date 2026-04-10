import { NextRequest, NextResponse } from "next/server";
import { getPageHistory } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

type RouteParams = { params: Promise<{ slug: string; path: string[] }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug, path: segments } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const history = await getPageHistory(segments.join("/"), dataDir);
    return NextResponse.json(history);
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
