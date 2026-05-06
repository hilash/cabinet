import { NextResponse } from "next/server";
import { scanForSkills } from "@/lib/agents/skills/scan";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async (request: Request) => {
  const url = new URL(request.url);
  const cabinetPath = url.searchParams.get("cabinet") || undefined;
  const results = await scanForSkills({ cabinetPath });
  return NextResponse.json({ count: results.length, results });
});
