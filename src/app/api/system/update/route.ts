import { NextResponse } from "next/server";
import { getUpdateCheckResult } from "@/lib/system/update-service";

export async function GET() {
  const result = await getUpdateCheckResult();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

