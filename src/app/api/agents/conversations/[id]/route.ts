import { NextRequest, NextResponse } from "next/server";
import { readConversationDetail } from "@/lib/agents/conversation-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await readConversationDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
