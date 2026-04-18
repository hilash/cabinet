import { NextRequest } from "next/server";
import {
  readPersona,
  writePersona,
  deletePersona,
  readMemory,
  writeMemory,
  listMemoryFiles,
  readInbox,
  sendMessage,
  getHeartbeatHistory,
  readSessionOutput,
} from "@/lib/agents/persona/persona-manager";
import { startManualHeartbeat } from "@/lib/agents/persona/heartbeat";
import { updateGoal, getGoalHistory } from "@/lib/agents/persona/goal-manager";
import { reloadDaemonSchedules } from "@/lib/agents/runtime/daemon-client";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createGetHandler({
    handler: async () => {
      assertValidSlug(slug);
      const { searchParams } = new URL(req.url);

      const sessionTs = searchParams.get("session");
      if (sessionTs) {
        const output = await readSessionOutput(slug, sessionTs);
        return { output };
      }

      const persona = await readPersona(slug);
      if (!persona) {
        throw new HttpError(404, "Not found");
      }

      const memoryFiles = await listMemoryFiles(slug);
      const memory: Record<string, string> = {};
      for (const file of memoryFiles) {
        if (file.endsWith(".md")) {
          memory[file] = await readMemory(slug, file);
        }
      }

      const inbox = await readInbox(slug);
      const history = await getHeartbeatHistory(slug);
      const goalHistory = await getGoalHistory(slug);

      return { persona, memory, inbox, history, goalHistory };
    },
  })(req);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createHandler({
    handler: async () => {
      assertValidSlug(slug);
      const body = await req.json();

      if (body.action === "toggle") {
        const persona = await readPersona(slug);
        if (!persona) {
          throw new HttpError(404, "Not found");
        }
        await writePersona(slug, { active: !persona.active });
        await reloadDaemonSchedules().catch(() => {});
        return { ok: true, active: !persona.active };
      }

      if (body.action === "run") {
        const sessionId = await startManualHeartbeat(slug);
        if (!sessionId) {
          throw new HttpError(400, "Agent inactive or over budget");
        }
        return { ok: true, sessionId };
      }

      if (body.action === "updateMemory") {
        await writeMemory(slug, body.file, body.content);
        return { ok: true };
      }

      if (body.action === "sendMessage") {
        await sendMessage(slug, body.to, body.message);
        return { ok: true };
      }

      if (body.action === "updateGoal") {
        const result = await updateGoal(slug, body.metric, body.increment || 1);
        return { ok: true, goal: result };
      }

      await writePersona(slug, body);
      await reloadDaemonSchedules().catch(() => {});
      return { ok: true };
    },
  })(req);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createHandler<void, { ok: true }>({
    handler: async () => {
      assertValidSlug(slug);
      await deletePersona(slug);
      await reloadDaemonSchedules().catch(() => {});
      return { ok: true };
    },
  })(req);
}
