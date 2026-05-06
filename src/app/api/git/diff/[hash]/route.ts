import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/git/git-service";
import { route } from "@/lib/runtime/route-wrapper";

type RouteParams = { params: Promise<{ hash: string }> };

export const GET = route(async (_req: NextRequest, { params }: RouteParams) => {
  try {
    const { hash } = await params;
    const diff = await getDiff(hash);
    return NextResponse.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
