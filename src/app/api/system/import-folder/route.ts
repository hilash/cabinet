import { NextRequest, NextResponse } from "next/server";
import { importDirectory } from "@/lib/storage/import-folder";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { source?: string; parentPath?: string };
    const source = body.source?.trim();
    if (!source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }
    const { path } = await importDirectory(source, body.parentPath?.trim() || "");
    return NextResponse.json({ ok: true, path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
