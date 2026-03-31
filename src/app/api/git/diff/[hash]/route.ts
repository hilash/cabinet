import { NextRequest, NextResponse } from "next/server";
import { getDiff } from "@/lib/git/git-service";

type RouteParams = { params: Promise<{ hash: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const diff = await getDiff(hash);
    return NextResponse.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
