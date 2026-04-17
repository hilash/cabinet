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
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ id: string; jobId: string }> };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(
  req: Request,
  { params }: RouteParams
) {
  const { id: slug, jobId } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        const jobs = await loadAgentJobsBySlug(slug);
        const job = jobs.find((j) => jobIdMatches(j.id, jobId));
        if (!job) {
          throw new HttpError(404, "Job not found");
        }

        return { job };
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}

export async function PUT(
  req: Request,
  { params }: RouteParams
) {
  const { id: slug, jobId } = await params;
  return createHandler({
    handler: async (_input, request) => {
      try {
        const jobs = await loadAgentJobsBySlug(slug);
        const existing = jobs.find((j) => jobIdMatches(j.id, jobId));
        if (!existing) {
          throw new HttpError(404, "Job not found");
        }

        const body = await request.json();

        // Handle run action
        if (body.action === "run") {
          const run = await executeJob(existing);
          return { ok: true, run };
        }

        // Handle toggle action
        if (body.action === "toggle") {
          existing.enabled = !existing.enabled;
          existing.updatedAt = new Date().toISOString();
          await saveAgentJob(slug, existing);
          await reloadDaemonSchedules().catch(() => {});
          return { ok: true, job: existing };
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
        return { ok: true, job: normalized };
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}

export async function DELETE(
  req: Request,
  { params }: RouteParams
) {
  const { id: slug, jobId } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        await deleteAgentJob(slug, jobId);
        await reloadDaemonSchedules().catch(() => {});
        return { ok: true };
      } catch (error) {
        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}
