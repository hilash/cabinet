import { NextRequest, NextResponse } from "next/server";
import { manualCommit, getStatus } from "@/lib/git/git-service";
import { route } from "@/lib/runtime/route-wrapper";

export const POST = route(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const message = body.message || "Manual commit from KB";
    const committed = await manualCommit(message);
    return NextResponse.json({ ok: true, committed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const GET = route(async () => {
  try {
    const status = await getStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
