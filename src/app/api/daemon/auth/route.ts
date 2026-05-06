import { NextResponse } from "next/server";
import { getOrCreateDaemonToken } from "@/lib/agents/daemon-auth";
import { getPublicDaemonWsOrigin } from "@/lib/runtime/runtime-config";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async () => {
  const token = await getOrCreateDaemonToken();
  return NextResponse.json({ token, wsOrigin: getPublicDaemonWsOrigin() });
});
