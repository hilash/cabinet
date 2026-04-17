import { DATA_DIR } from "@/lib/storage/path-utils";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";
import { runCodeReviewPipeline } from "@/lib/agents/review-pipeline";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";
import {
  validateTaskReviewSchema,
  type TaskReviewResult,
} from "./task-review-schema";

interface TaskReviewPayload {
  taskId?: string;
  title?: string;
  description?: string;
  tags?: string[];
  linkedPages?: string[];
  providerId?: string;
}

interface CodeReviewPayload {
  mode?: string;
  providerId?: string;
  workdir?: string;
  compareRange?: string;
  baseRef?: string;
  headRef?: string;
  includePaths?: string[];
  maxDiffChars?: number;
  maxFiles?: number;
  timeoutMs?: number;
  saveArtifact?: boolean;
  options?: {
    workdir?: string;
    compareRange?: string;
    baseRef?: string;
    headRef?: string;
    includePaths?: string[];
    maxDiffChars?: number;
    maxFiles?: number;
    timeoutMs?: number;
    saveArtifact?: boolean;
    providerId?: string;
  };
}

function cleanProviderJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned.trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function handleTaskReview(body: TaskReviewPayload) {
  const { taskId, title, description, tags, linkedPages, providerId } = body;

  if (!title) {
    throw new HttpError(400, "title is required");
  }

  const prompt = `You are an AI task reviewer for a startup knowledge base. Review this task and suggest improvements.

TASK:
- Title: ${title}
- Description: ${description || "(none)"}
- Tags: ${tags?.length ? tags.join(", ") : "(none)"}
- Linked KB pages: ${linkedPages?.length ? linkedPages.join(", ") : "(none)"}

Respond with ONLY a JSON object (no markdown, no code fences, no explanation) with these fields:
{
  "description": "improved description with clear scope and acceptance criteria (2-4 sentences)",
  "tags": ["suggested", "tags", "max-4"],
  "priority": "P0|P1|P2",
  "estimatedEffort": "small|medium|large",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "suggestions": "one sentence of strategic advice about this task"
}

Rules:
- Keep the original intent — don't change what the task is about
- Description should be actionable and specific
- Tags should categorize the work area (engineering, research, gtm, ops, etc.)
- Priority: P0 = do now, P1 = do this week, P2 = backlog
- Acceptance criteria should be concrete and verifiable
- Output ONLY valid JSON, nothing else`;

  const result = await runOneShotProviderPrompt({
    providerId,
    prompt,
    cwd: DATA_DIR,
    timeoutMs: 120_000,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanProviderJson(result));
  } catch {
    throw new HttpError(502, "AI returned invalid JSON response. Please retry.");
  }

  let review: TaskReviewResult;
  try {
    review = validateTaskReviewSchema(parsed);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    throw new HttpError(502, `AI response failed schema validation: ${reason}`);
  }

  return {
    ok: true,
    mode: "task",
    taskId,
    review,
  };
}

export const POST = createHandler({
  handler: async (_input, req) => {
    try {
      const body = (await req.json()) as TaskReviewPayload & CodeReviewPayload;
      const mode = typeof body.mode === "string" ? body.mode.trim().toLowerCase() : "";

      if (mode && mode !== "task" && mode !== "code") {
        throw new HttpError(400, "mode must be task or code");
      }

      if (mode === "task" || (!mode && body.title)) {
        return await handleTaskReview(body);
      }

      if (!mode) {
        throw new HttpError(400, "mode is required when title is not provided");
      }

      const options = body.options || {};
      const result = await runCodeReviewPipeline({
        providerId: body.providerId || options.providerId,
        workdir: body.workdir || options.workdir,
        compareRange: body.compareRange || options.compareRange,
        baseRef: body.baseRef || options.baseRef,
        headRef: body.headRef || options.headRef,
        includePaths: Array.isArray(body.includePaths)
          ? body.includePaths
          : options.includePaths,
        maxDiffChars:
          typeof body.maxDiffChars === "number"
            ? body.maxDiffChars
            : options.maxDiffChars,
        maxFiles:
          typeof body.maxFiles === "number"
            ? body.maxFiles
            : options.maxFiles,
        timeoutMs:
          typeof body.timeoutMs === "number"
            ? body.timeoutMs
            : options.timeoutMs,
        saveArtifact:
          typeof body.saveArtifact === "boolean"
            ? body.saveArtifact
            : options.saveArtifact,
      });

      return {
        ok: true,
        mode: "code",
        ...result,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, getErrorMessage(error));
    }
  },
});
