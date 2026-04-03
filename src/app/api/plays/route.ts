import { NextRequest, NextResponse } from "next/server";
import { listPlays, writePlay, getPlayHistory, registerScheduledPlays } from "@/lib/agents/play-manager";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const withHistory = searchParams.get("history") === "true";
  const plays = await listPlays();

  if (withHistory) {
    const history = await getPlayHistory(undefined, 100);
    return NextResponse.json({ plays, history });
  }

  return NextResponse.json({ plays });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, title, category, schedule, triggers, tools, timeout, body: playBody } = body;

  if (!name || !title) {
    return NextResponse.json({ error: "name and title required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  await writePlay(slug, {
    name,
    title,
    category: category || "general",
    schedule,
    triggers: triggers || [{ type: "manual" }],
    tools: tools || [],
    timeout: timeout || 300,
    slug,
    body: playBody || "",
  });

  // Re-register scheduled plays in case the new one has a cron trigger
  await registerScheduledPlays();

  return NextResponse.json({ slug });
}
