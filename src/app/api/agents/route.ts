import { createGetHandler, createHandler, HttpError } from "@/lib/http/create-handler";
import {
  getActiveSessions,
  getRecentSessions,
  runAgent,
  getAgentStats,
} from "@/lib/agents/agent-manager";

export const GET = createGetHandler({
  handler: async () => {
    const active = getActiveSessions();
    const recent = getRecentSessions();
    const stats = getAgentStats();
    return { active, recent, stats };
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const { taskTitle, prompt, taskId, workdir, providerId } = body;

    if (!prompt) {
      throw new HttpError(400, "prompt is required");
    }

    const sessionId = await runAgent(
      taskTitle || "Manual agent run",
      prompt,
      taskId,
      workdir,
      providerId,
    );

    return { ok: true, sessionId };
  },
});
