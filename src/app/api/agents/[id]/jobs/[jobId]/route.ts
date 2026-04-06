import { NextRequest, NextResponse } from "next/server";
import {
  loadAgentJobsBySlug,
  saveAgentJob,
  deleteAgentJob,
  executeJob,
} from "@/lib/jobs/job-manager";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import {
  jobIdMatches,
  normalizeJobConfig,
} from "@/lib/jobs/job-normalization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const { id: slug, jobId } = await params;
  try {
    const jobs = await loadAgentJobsBySlug(slug);
    const job = jobs.find((j) => jobIdMatches(j.id, jobId));
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const { id: slug, jobId } = await params;
  try {
    const jobs = await loadAgentJobsBySlug(slug);
    const existing = jobs.find((j) => jobIdMatches(j.id, jobId));
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();

    // Handle run action
    if (body.action === "run") {
      const run = await executeJob(existing);
      return NextResponse.json({ ok: true, run });
    }

    // Handle toggle action
    if (body.action === "toggle") {
      existing.enabled = !existing.enabled;
      existing.updatedAt = new Date().toISOString();
      await saveAgentJob(slug, existing);
      await reloadDaemonSchedules().catch(() => {});
      return NextResponse.json({ ok: true, job: existing });
    }

    // Update fields
    const updated = {
      ...existing,
      ...body,
      id: existing.id,
      agentSlug: slug,
      updatedAt: new Date().toISOString(),
    };
    const normalized = normalizeJobConfig(updated, slug, existing.id);
    await saveAgentJob(slug, normalized);
    await reloadDaemonSchedules().catch(() => {});
    return NextResponse.json({ ok: true, job: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const { id: slug, jobId } = await params;
  try {
    await deleteAgentJob(slug, jobId);
    await reloadDaemonSchedules().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
