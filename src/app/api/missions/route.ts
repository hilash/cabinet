import { NextRequest, NextResponse } from "next/server";
import { listMissions, createMission } from "@/lib/missions/mission-io";

export async function GET() {
  try {
    const missions = await listMissions();
    return NextResponse.json({ missions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: goalBody, outputPath } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const mission = await createMission(title, goalBody || "", outputPath);
    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
