import { NextRequest, NextResponse } from "next/server";
import { loadAgentJobsBySlug, saveAgentJob } from "@/lib/jobs/job-manager";
import type { JobConfig } from "@/types/jobs";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import { getDefaultProviderId } from "@/lib/agents/provider-runtime";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  try {
    const jobs = await loadAgentJobsBySlug(slug);
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const job: JobConfig = {
      id: body.id || `job-${Date.now()}`,
      name: body.name || "Untitled Job",
      enabled: body.enabled ?? true,
      schedule: body.schedule || "0 9 * * *",
      provider: body.provider || getDefaultProviderId(),
      agentSlug: slug,
      workdir: body.workdir,
      timeout: body.timeout || 600,
      prompt: body.prompt || "",
      on_complete: body.on_complete,
      on_failure: body.on_failure,
      createdAt: now,
      updatedAt: now,
    };

    await saveAgentJob(slug, job);
    await reloadDaemonSchedules().catch(() => {});
    return NextResponse.json({ ok: true, job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
