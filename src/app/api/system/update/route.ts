import { NextResponse } from "next/server";
import { getUpdateCheckResult } from "@/lib/system/update-service";
import { route } from "@/lib/runtime/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const result = await getUpdateCheckResult();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
});

