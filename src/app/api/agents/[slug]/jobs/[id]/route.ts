import { NextRequest, NextResponse } from "next/server";
import {
  loadAgentJobsBySlug,
  saveAgentJob,
  deleteAgentJob,
  executeJob,
} from "@/lib/jobs/job-manager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  try {
    const jobs = await loadAgentJobsBySlug(slug);
    const job = jobs.find((j) => j.id === id);
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
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  try {
    const jobs = await loadAgentJobsBySlug(slug);
    const existing = jobs.find((j) => j.id === id);
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
      return NextResponse.json({ ok: true, job: existing });
    }

    // Update fields
    const updated = {
      ...existing,
      ...body,
      id, // preserve id
      agentSlug: slug,
      updatedAt: new Date().toISOString(),
    };
    await saveAgentJob(slug, updated);
    return NextResponse.json({ ok: true, job: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  try {
    await deleteAgentJob(slug, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
