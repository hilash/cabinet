import { NextRequest, NextResponse } from "next/server";
import { getDaemonSessionOutput } from "@/lib/agents/daemon-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const output = await getDaemonSessionOutput(id);
    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load daemon output";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
