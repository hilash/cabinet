import { NextRequest, NextResponse } from "next/server";
import {
  getRequirementPipeline,
  isValidRequirementPipelineId,
} from "@/lib/agents/requirement-pipeline";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidRequirementPipelineId(id)) {
      return NextResponse.json(
        { error: "Invalid pipeline id" },
        { status: 400 }
      );
    }
    const pipeline = await getRequirementPipeline(id);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ pipeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
