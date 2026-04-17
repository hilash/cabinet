import {
  getRequirementPipeline,
  isValidRequirementPipelineId,
} from "@/lib/agents/requirement-pipeline";
import {
  HttpError,
  createGetHandler,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ id: string }> };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(
  req: Request,
  { params }: RouteParams
) {
  const { id } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        if (!isValidRequirementPipelineId(id)) {
          throw new HttpError(400, "Invalid pipeline id");
        }

        const pipeline = await getRequirementPipeline(id);
        if (!pipeline) {
          throw new HttpError(404, "Pipeline not found");
        }

        return { pipeline };
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}
