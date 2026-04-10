import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { broadcastContentUpdate } from "@/lib/presence/presence-store";

/**
 * POST /api/presence/content
 * Broadcasts a document content update to all team members currently viewing
 * the same page (excluding the author). Called after a successful auto-save.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { path, content } = body;

  if (typeof path !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  broadcastContentUpdate(path, content, session.user.id);

  return NextResponse.json({ ok: true });
}
