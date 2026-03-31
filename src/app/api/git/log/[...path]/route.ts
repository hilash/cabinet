import { NextRequest, NextResponse } from "next/server";
import { getPageHistory } from "@/lib/git/git-service";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const virtualPath = segments.join("/");
    const history = await getPageHistory(virtualPath);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
