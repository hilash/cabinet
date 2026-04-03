import { NextResponse } from "next/server";
import { getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";

export async function GET() {
  const token = await getOrCreateDaemonToken();
  return NextResponse.json({ token });
}
