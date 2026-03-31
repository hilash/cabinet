import { NextRequest, NextResponse } from "next/server";
import { readPlay, writePlay, deletePlay, executePlay } from "@/lib/agents/play-manager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const play = await readPlay(slug);
  if (!play) {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }
  return NextResponse.json(play);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  await writePlay(slug, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  await deletePlay(slug);
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();

  if (body.action === "trigger") {
    const play = await readPlay(slug);
    if (!play) {
      return NextResponse.json({ error: "Play not found" }, { status: 404 });
    }
    // Execute in background
    executePlay(slug, body.agentContext).catch((err) => {
      console.error(`Play ${slug} execution failed:`, err);
    });
    return NextResponse.json({ status: "triggered" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
