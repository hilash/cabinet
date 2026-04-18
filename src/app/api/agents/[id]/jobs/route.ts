import { NextRequest } from "next/server";
import { loadAgentJobsBySlug, saveAgentJob } from "@/lib/jobs/job-manager";
import type { JobConfig } from "@/types/jobs";
import { reloadDaemonSchedules } from "@/lib/agents/runtime/daemon-client";
import { normalizeJobConfig } from "@/lib/jobs/job-normalization";
import { createGetHandler, createHandler } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: slug } = await params;
  return createGetHandler({
    handler: async () => {
      assertValidSlug(slug, "id");
      const jobs = await loadAgentJobsBySlug(slug);
      return { jobs };
    },
  })(req);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: slug } = await params;
  return createHandler({
    handler: async (_input, r) => {
      assertValidSlug(slug, "id");
      const body = await r.json();
      const now = new Date().toISOString();
      const job: JobConfig = normalizeJobConfig(
        { ...body, createdAt: now, updatedAt: now },
        slug,
        `job-${Date.now()}`,
      );

      await saveAgentJob(slug, job);
      await reloadDaemonSchedules().catch(() => {});
      return { ok: true, job };
    },
  })(req);
}
