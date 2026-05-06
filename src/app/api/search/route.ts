import { NextRequest, NextResponse } from "next/server";
import { getDaemonUrl, getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";
import type { SearchResponse } from "../../../../server/search/types";
import { route } from "@/lib/runtime/route-wrapper";

const DAEMON_HINT = "Search is unavailable. Start the daemon: npm run dev:daemon";

export const GET = route(async (req: NextRequest) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";

  const empty: SearchResponse = {
    query: q,
    scope: scope as SearchResponse["scope"],
    pages: [],
    agents: [],
    tasks: [],
    tookMs: 0,
    indexReady: false,
  };

  if (!q) {
    return NextResponse.json(empty);
  }

  try {
    const token = await getOrCreateDaemonToken();
    const url = `${getDaemonUrl()}/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(scope)}&limit=${encodeURIComponent(limit)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ...empty, error: `Daemon returned ${res.status}`, hint: DAEMON_HINT },
        { status: 503 }
      );
    }

    const data = (await res.json()) as SearchResponse;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json(
      { ...empty, error: message, hint: DAEMON_HINT },
      { status: 503 }
    );
  }
});
