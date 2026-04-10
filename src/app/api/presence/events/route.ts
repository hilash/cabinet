import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  registerSSEClient,
  unregisterSSEClient,
  removePresence,
  getTeamPresence,
} from "@/lib/presence/presence-store";

/**
 * GET /api/presence/events?team={slug}
 * Server-Sent Events stream for real-time presence updates.
 * Sends an initial snapshot of all active team members, then pushes
 * incremental updates whenever any user calls POST /api/presence.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamSlug = req.nextUrl.searchParams.get("team") ?? "default";
  const userId = session.user.id;
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register so broadcast() can push to this client
      registerSSEClient(userId, controller);

      // Send snapshot of all currently active team members
      const snapshot = getTeamPresence(teamSlug);
      controller.enqueue(
        enc.encode(
          `event: presence\ndata: ${JSON.stringify({ type: "snapshot", users: snapshot })}\n\n`
        )
      );

      // Auto-close after 10 minutes — EventSource reconnects automatically
      const timeout = setTimeout(() => {
        unregisterSSEClient(userId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 10 * 60 * 1000);

      // On client disconnect: unregister SSE + remove presence immediately
      req.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        unregisterSSEClient(userId);
        removePresence(userId);
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
