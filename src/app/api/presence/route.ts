import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { updatePresence } from "@/lib/presence/presence-store";

/**
 * POST /api/presence
 * Update the current user's presence: which page they're on, cursor position, scroll offset.
 * Called on heartbeat (every 10s) and on selection/scroll changes (debounced 300ms).
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { teamSlug, currentPath, selectionFrom, selectionTo, scrollY } = body;

  updatePresence({
    userId: session.user.id,
    name: session.user.name ?? session.user.email ?? "User",
    image: session.user.image ?? null,
    teamSlug: teamSlug ?? "default",
    currentPath: currentPath ?? null,
    selectionFrom:
      typeof selectionFrom === "number" ? selectionFrom : undefined,
    selectionTo: typeof selectionTo === "number" ? selectionTo : undefined,
    scrollY: typeof scrollY === "number" ? scrollY : undefined,
    lastSeen: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
