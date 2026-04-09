import { NextRequest, NextResponse } from "next/server";
import { manualCommit, getStatus } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const body = await req.json();
    const message = body.message || "Manual commit from KB";
    const committed = await manualCommit(message, dataDir);
    return NextResponse.json({ ok: true, committed });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);
    const status = await getStatus(dataDir);
    return NextResponse.json(status);
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
