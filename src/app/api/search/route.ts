import { NextRequest, NextResponse } from "next/server";
import { getDaemonUrl, getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";
import { resolveDefaultRoom } from "@/lib/cabinets/rooms";
import type { SearchResponse } from "../../../../server/search/types";

const DAEMON_HINT = "Search is unavailable. Start the daemon: npm run dev:daemon";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  let cabinet = req.nextUrl.searchParams.get("cabinet") ?? "";
  // Explicit, opt-in cross-room search (PRD §10.1). Anything else is scoped.
  const includeOtherRooms =
    req.nextUrl.searchParams.get("includeOtherRooms") === "1";

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

  // Fail closed (PRD §10.1): a search that isn't an explicit cross-room
  // request must be scoped to a room. If the caller didn't pass one, resolve
  // a valid room rather than letting the daemon search every room by omission.
  if (!includeOtherRooms && !cabinet) {
    try {
      cabinet = (await resolveDefaultRoom()) ?? "";
    } catch {
      // no rooms yet → cabinet stays empty → the daemon returns nothing
    }
  }

  try {
    const token = await getOrCreateDaemonToken();
    const cabinetParam = cabinet
      ? `&cabinet=${encodeURIComponent(cabinet)}`
      : "";
    const crossParam = includeOtherRooms ? "&includeOtherRooms=1" : "";
    const url = `${getDaemonUrl()}/search?q=${encodeURIComponent(q)}&scope=${encodeURIComponent(scope)}&limit=${encodeURIComponent(limit)}${cabinetParam}${crossParam}`;
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
}
