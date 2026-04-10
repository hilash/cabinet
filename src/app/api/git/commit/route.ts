import { NextRequest, NextResponse } from "next/server";
import {
  manualCommit,
  manualCommitFiles,
  getStatus,
  getChangedFiles,
} from "@/lib/git/git-service";

export async function POST(req: NextRequest) {
  try {
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
      committed = await manualCommitFiles(message, files, authorName, authorEmail);
    } else {
      committed = await manualCommit(message);
    }

    return NextResponse.json({ ok: true, committed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [status, files] = await Promise.all([getStatus(), getChangedFiles()]);
    return NextResponse.json({ ...status, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
