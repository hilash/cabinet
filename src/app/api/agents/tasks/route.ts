import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  getTasksForAgent,
  getAllTasks,
  updateTask,
} from "@/lib/agents/task-inbox";

// GET /api/agents/tasks?agent=slug&status=pending
// or GET /api/agents/tasks?all=true  (all tasks across agents)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agent = searchParams.get("agent");
  const status = searchParams.get("status") as
    | "pending"
    | "in_progress"
    | "completed"
    | "failed"
    | null;
  const all = searchParams.get("all");

  if (all === "true") {
    const tasks = await getAllTasks(status ?? undefined);
    return NextResponse.json({ tasks });
  }

  if (!agent) {
    return NextResponse.json(
      { error: "agent query param required" },
      { status: 400 }
    );
  }

  const tasks = await getTasksForAgent(agent, status ?? undefined);
  return NextResponse.json({ tasks });
}

// POST /api/agents/tasks
// Body: { fromAgent, toAgent, title, description, kbRefs?, priority?, channel? }
// or { action: "update", agent, taskId, status, result? }
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "update") {
    const { agent, taskId, status, result } = body;
    if (!agent || !taskId || !status) {
      return NextResponse.json(
        { error: "agent, taskId, and status required" },
        { status: 400 }
      );
    }
    const updated = await updateTask(agent, taskId, { status, result });
    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ task: updated });
  }

  // Create new task
  const { fromAgent, toAgent, title, description, kbRefs, priority, channel,
    fromEmoji, fromName } = body;

  if (!fromAgent || !toAgent || !title) {
    return NextResponse.json(
      { error: "fromAgent, toAgent, and title required" },
      { status: 400 }
    );
  }

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

  return NextResponse.json({ task });
}
