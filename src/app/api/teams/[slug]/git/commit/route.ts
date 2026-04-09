import { NextRequest, NextResponse } from "next/server";
import {
  manualCommit,
  manualCommitFiles,
  getStatus,
  getChangedFiles,
} from "@/lib/git/git-service";
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
    const {
      message = "Manual commit from KB",
      files,
      authorName,
      authorEmail,
    } = body as {
      message?: string;
      files?: string[];
      authorName?: string;
      authorEmail?: string;
    };

    let committed: boolean;
    if (files && files.length > 0 && authorName && authorEmail) {
      committed = await manualCommitFiles(message, files, authorName, authorEmail, dataDir);
    } else {
      committed = await manualCommit(message, dataDir);
    }

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
    const [status, files] = await Promise.all([
      getStatus(dataDir),
      getChangedFiles(dataDir),
    ]);
    return NextResponse.json({ ...status, files });
  } catch (err) {
    return teamContextErrorResponse(err);
  }
}
