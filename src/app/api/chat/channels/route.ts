import { NextRequest, NextResponse } from "next/server";
import {
  listChannels,
  createChannel,
  getLatestMessageTime,
} from "@/lib/chat/chat-io";

export async function GET() {
  try {
    const channels = await listChannels();
    // Enrich with latest message time
    const enriched = channels.map((ch) => ({
      ...ch,
      lastMessageAt: getLatestMessageTime(ch.slug),
    }));
    return NextResponse.json({ channels: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, name, members, description } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "slug and name are required" },
        { status: 400 }
      );
    }

    await createChannel({ slug, name, members: members || [], description });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
