import { NextResponse } from "next/server";
import { createGetHandler } from "@/lib/http/create-handler";
import { readUpdateStatus } from "@/lib/system/update-status";

export const dynamic = "force-dynamic";

export const GET = createGetHandler({
  handler: async () => {
    const status = await readUpdateStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  },
});
