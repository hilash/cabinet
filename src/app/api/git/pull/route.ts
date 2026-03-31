import { NextResponse } from "next/server";
import { gitPull } from "@/lib/git/git-service";

export async function POST() {
  try {
    const result = await gitPull();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ pulled: false, summary: message }, { status: 500 });
  }
}
