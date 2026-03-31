import { NextRequest, NextResponse } from "next/server";
import { getActivityFeed, logActivity } from "@/lib/activity/activity-io";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const agentSlug = url.searchParams.get("agent") || undefined;
    const eventType = url.searchParams.get("type") || undefined;

    const result = getActivityFeed({ limit, offset, agentSlug, eventType });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentSlug, eventType, summary, details, links, missionId, channelSlug } = body;

    if (!eventType || !summary) {
      return NextResponse.json(
        { error: "eventType and summary are required" },
        { status: 400 }
      );
    }

    const event = logActivity({
      agentSlug,
      eventType,
      summary,
      details,
      links,
      missionId,
      channelSlug,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
