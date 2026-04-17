import { NextResponse } from "next/server";
import { createGetHandler } from "@/lib/http/create-handler";

export const dynamic = "force-dynamic";

export const GET = createGetHandler({
  handler: async () =>
    NextResponse.json(
      {
        current: { version: "0.4.1" },
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
      },
      { headers: { "Cache-Control": "no-store" } },
    ),
});
