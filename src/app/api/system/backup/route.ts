import { NextRequest, NextResponse } from "next/server";
import { createDataBackup, createProjectSnapshotBackup } from "@/lib/system/backup";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { scope?: "data" | "project" };
    const scope = body.scope === "project" ? "project" : "data";
    const backupPath =
      scope === "project"
        ? await createProjectSnapshotBackup("manual-project-backup")
        : await createDataBackup("manual-data-backup");

    return NextResponse.json({ ok: true, scope, backupPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
