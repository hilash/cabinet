import { NextResponse } from "next/server";
import { readUpdateStatus } from "@/lib/system/update-status";

export async function GET() {
  const status = await readUpdateStatus();
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

