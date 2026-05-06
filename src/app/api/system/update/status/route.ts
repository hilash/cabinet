import { NextResponse } from "next/server";
import { readUpdateStatus } from "@/lib/system/update-status";
import { route } from "@/lib/runtime/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const status = await readUpdateStatus();
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
});

