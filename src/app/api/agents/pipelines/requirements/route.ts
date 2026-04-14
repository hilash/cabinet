import { NextRequest, NextResponse } from "next/server";
import {
  listRequirementPipelines,
  runRequirementPipeline,
} from "@/lib/agents/requirement-pipeline";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 30;
    const pipelines = await listRequirementPipelines(
      Number.isFinite(limit) && limit > 0 ? limit : 30
    );
    return NextResponse.json({ pipelines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requirement =
      typeof body.requirement === "string" ? body.requirement.trim() : "";
    if (!requirement) {
      return NextResponse.json(
        { error: "requirement is required" },
        { status: 400 }
      );
    }

    const pipeline = await runRequirementPipeline({
      requirement,
      providerId:
        typeof body.providerId === "string" ? body.providerId : undefined,
      channel: typeof body.channel === "string" ? body.channel : undefined,
      maxTasks:
        typeof body.maxTasks === "number" ? body.maxTasks : undefined,
      autoRun:
        typeof body.autoRun === "boolean" ? body.autoRun : undefined,
    });

    return NextResponse.json({ ok: true, pipeline }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
