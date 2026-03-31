import { NextRequest, NextResponse } from "next/server";
import {
  updateMissionTask,
  deleteMissionTask,
} from "@/lib/missions/mission-io";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const { tid } = await params;
  try {
    const body = await req.json();
    const task = updateMissionTask(tid, body);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tid: string }> }
) {
  const { tid } = await params;
  try {
    deleteMissionTask(tid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
