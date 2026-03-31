import { NextRequest, NextResponse } from "next/server";
import {
  loadAllJobs,
  saveJob,
  getRunHistory,
} from "@/lib/jobs/job-manager";
import type { JobConfig } from "@/types/jobs";

export async function GET() {
  try {
    const jobs = await loadAllJobs();
    const history = getRunHistory();
    return NextResponse.json({ jobs, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const job: JobConfig = {
      id: body.id || `job-${Date.now()}`,
      name: body.name,
      enabled: body.enabled ?? true,
      schedule: body.schedule,
      provider: body.provider || "claude-code",
      workdir: body.workdir,
      timeout: body.timeout || 600,
      prompt: body.prompt,
      createdAt: now,
      updatedAt: now,
    };

    await saveJob(job);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
