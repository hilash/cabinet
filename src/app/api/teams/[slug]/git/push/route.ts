import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { gitPushWithToken } from "@/lib/git/git-service";
import { requireTeamContext, teamContextErrorResponse } from "@/lib/teams/team-context";
import { getTeamDataDir } from "@/lib/teams/team-fs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const ctx = await requireTeamContext(slug);
    const dataDir = getTeamDataDir(slug);

    const db = getDb();
    const account = db
      .prepare(
        "SELECT accessToken FROM account WHERE userId = ? AND providerId = 'github'"
      )
      .get(ctx.userId) as { accessToken: string | null } | undefined;

    if (!account?.accessToken) {
      return NextResponse.json({
        pushed: false,
        summary:
          "No GitHub account linked. Sign in with GitHub to enable push.",
      });
    }

    const result = await gitPushWithToken(account.accessToken, dataDir);
    return NextResponse.json(result);
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
