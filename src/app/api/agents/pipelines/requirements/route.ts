import {
  listRequirementPipelines,
  runRequirementPipeline,
} from "@/lib/agents/pipeline/requirement-pipeline";
import {
  createGetHandler,
  createHandler,
  HttpError,
} from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async (req) => {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 30;
    const pipelines = await listRequirementPipelines(
      Number.isFinite(limit) && limit > 0 ? limit : 30,
    );
    return { pipelines };
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const requirement =
      typeof body.requirement === "string" ? body.requirement.trim() : "";
    if (!requirement) {
      throw new HttpError(400, "requirement is required");
    }

    const pipeline = await runRequirementPipeline({
      requirement,
      providerId:
        typeof body.providerId === "string" ? body.providerId : undefined,
      channel: typeof body.channel === "string" ? body.channel : undefined,
      maxTasks: typeof body.maxTasks === "number" ? body.maxTasks : undefined,
      autoRun: typeof body.autoRun === "boolean" ? body.autoRun : undefined,
    });

    return { ok: true, pipeline };
  },
});
