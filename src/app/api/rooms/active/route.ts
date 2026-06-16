import { NextRequest, NextResponse } from "next/server";
import { setLastActive } from "@/lib/cabinets/rooms";

export const dynamic = "force-dynamic";

/**
 * Record the user's current location so the app can reopen there (PRD §10.5).
 * Body: `{ path: "<root-relative cabinet/page path>" }`. Best-effort; ignores
 * the home container and unknown rooms (see `setLastActive`).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: unknown };
    if (typeof body.path !== "string" || !body.path.trim()) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    await setLastActive(body.path);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
