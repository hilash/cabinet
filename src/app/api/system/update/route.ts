import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // 自动更新已禁用（本地定制版本）
  return NextResponse.json({
    current: { version: "0.2.12" },
    latest: null,
    updateAvailable: false,
    canApplyUpdate: false,
    installKind: "electron-macos",
    dataDir: "",
    backupRoot: "",
    dirtyAppFiles: [],
    instructions: [],
    latestReleaseNotesUrl: null,
    updateStatus: { state: "idle" },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

