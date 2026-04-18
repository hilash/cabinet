import { z } from "zod";
import {
  createTask,
  getTasksForAgent,
  getAllTasks,
  updateTask,
  type TaskStatus,
} from "@/lib/agents/inbox/task-inbox";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

const taskMutationSchema = z
  .object({
    action: z.string().optional(),
    agent: z.string().optional(),
    taskId: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
    result: z.string().optional(),
    fromAgent: z.string().optional(),
    fromEmoji: z.string().optional(),
    fromName: z.string().optional(),
    toAgent: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    kbRefs: z.array(z.string()).optional(),
    priority: z.number().optional(),
    channel: z.string().optional(),
  })
  .passthrough();

// GET /api/agents/tasks?agent=slug&status=pending
// or GET /api/agents/tasks?all=true  (all tasks across agents)
export const GET = createGetHandler({
  handler: async (req) => {
    const { searchParams } = new URL(req.url);
    const agent = searchParams.get("agent");
    const status = searchParams.get("status") as TaskStatus | null;
    const all = searchParams.get("all");

    if (all === "true") {
      const tasks = await getAllTasks(status ?? undefined);
      return { tasks };
    }

    if (!agent) {
      throw new HttpError(400, "agent query param required");
    }

    assertValidSlug(agent, "agent");
    const tasks = await getTasksForAgent(agent, status ?? undefined);
    return { tasks };
  },
});

// POST /api/agents/tasks
// Body: { fromAgent, toAgent, title, description, kbRefs?, priority?, channel? }
// or { action: "update", agent, taskId, status, result? }
export const POST = createHandler({
  input: taskMutationSchema,
  handler: async (body) => {
    if (body.action === "update") {
      const { agent, taskId, status, result } = body;
      if (!agent || !taskId || !status) {
        throw new HttpError(400, "agent, taskId, and status required");
      }

      assertValidSlug(agent, "agent");
      const updated = await updateTask(agent, taskId, { status, result });
      if (!updated) {
        throw new HttpError(404, "Task not found");
      }

      return { task: updated };
    }

    const {
      fromAgent,
      fromEmoji,
      fromName,
      toAgent,
      channel,
      title,
      description,
      kbRefs,
      priority,
    } = body;

    if (!fromAgent || !toAgent || !title) {
      throw new HttpError(400, "fromAgent, toAgent, and title required");
    }

    assertValidSlug(fromAgent, "fromAgent");
    assertValidSlug(toAgent, "toAgent");
    const task = await createTask({
      fromAgent,
      fromEmoji,
      fromName,
      toAgent,
      channel: channel || "general",
      title,
      description: description || "",
      kbRefs: kbRefs || [],
      priority: priority || 3,
    });

    return { task };
  },
});
