import { NextRequest, NextResponse } from "next/server";
import { isCabinetPath } from "@/lib/cabinets/server-paths";

export const dynamic = "force-dynamic";

/**
 * Classify a clean-path content segment: is `?path=` a cabinet (overview) or a
 * page (editor)? Used by the router on cold-load deep links where the tree
 * isn't in memory yet (PRD §11). Best-effort; defaults to not-a-cabinet.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path") ?? "";
  if (!p.trim()) return NextResponse.json({ isCabinet: false });
  try {
    return NextResponse.json({ isCabinet: await isCabinetPath(p) });
  } catch {
    return NextResponse.json({ isCabinet: false });
  }
}
