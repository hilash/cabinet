import { NextResponse } from "next/server";
import { gitPull } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const result = await gitPull(dataDir);
    return NextResponse.json(result);
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
