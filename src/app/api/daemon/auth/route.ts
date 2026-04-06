import { NextResponse } from "next/server";
import { getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";
import { getPublicDaemonWsOrigin } from "@/lib/runtime/runtime-config";

export async function GET() {
  const token = await getOrCreateDaemonToken();
  return NextResponse.json({ token, wsOrigin: getPublicDaemonWsOrigin() });
}
