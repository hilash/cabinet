import { NextRequest, NextResponse } from "next/server";
import { getChannel, getMessages, postMessage, togglePin } from "@/lib/chat/chat-io";
import { logActivity } from "@/lib/activity/activity-io";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const channel = await getChannel(slug);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const before = url.searchParams.get("before") || undefined;

    const messages = getMessages(slug, limit, before);
    return NextResponse.json({ channel, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const body = await req.json();

    // Handle pin action
    if (body.action === "pin" && body.messageId) {
      const pinned = togglePin(body.messageId);
      return NextResponse.json({ ok: true, pinned });
    }

    // Post new message
    const { fromId, fromType, content, replyTo } = body;

    if (!fromId || !content) {
      return NextResponse.json(
        { error: "fromId and content are required" },
        { status: 400 }
      );
    }

    const msg = postMessage(
      slug,
      fromId,
      fromType || "human",
      content,
      replyTo
    );

    // Detect @mentions for agent triggering
    const mentions = (content.match(/@([a-z0-9-]+)/g) || []).map((m: string) =>
      m.slice(1)
    );

    // Log activity for chat messages
    logActivity({
      agentSlug: fromType === "agent" ? fromId : undefined,
      eventType: "chat:message",
      summary: `posted in #${slug}`,
      details: content.slice(0, 200),
      channelSlug: slug,
    });

    return NextResponse.json({ message: msg, mentions }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
