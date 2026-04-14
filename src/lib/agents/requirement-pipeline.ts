import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { listPersonas } from "@/lib/agents/persona-manager";
import { createTask, getTask, updateTask } from "@/lib/agents/task-inbox";
import {
  buildManualConversationPrompt,
  startConversationRun,
  type ConversationCompletion,
} from "@/lib/agents/conversation-runner";
import { runOneShotProviderPrompt } from "@/lib/agents/provider-runtime";
import { postSystemMessage } from "@/lib/agents/slack-manager";

const REQUIREMENT_PIPELINES_DIR = path.join(DATA_DIR, ".agents", ".pipelines", "requirements");
const DEFAULT_TASK_LIMIT = 8;
const REQUIREMENT_PIPELINE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9-_]{2,127}$/;

type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface RequirementPipelineInput {
  requirement: string;
  providerId?: string;
  channel?: string;
  maxTasks?: number;
  autoRun?: boolean;
}

interface RequirementTaskDraft {
  title: string;
  description: string;
  agentSlug: string;
  priority: TaskPriority;
  acceptanceCriteria: string[];
  dependsOn: string[];
}

export interface RequirementPipelineTask {
  taskId: string;
  title: string;
  description: string;
  agentSlug: string;
  priority: TaskPriority;
  acceptanceCriteria: string[];
  dependsOn: string[];
  status: "pending" | "in_progress" | "completed" | "failed";
  conversationId?: string;
  result?: string;
}

export interface RequirementPipelineState {
  id: string;
  createdAt: string;
  updatedAt: string;
  requirement: string;
  channel: string;
  autoRun: boolean;
  summary: string;
  tasks: RequirementPipelineTask[];
}

function pipelinePath(id: string): string {
  assertRequirementPipelineId(id);
  const resolved = path.resolve(REQUIREMENT_PIPELINES_DIR, `${id}.json`);
  const root = `${REQUIREMENT_PIPELINES_DIR}${path.sep}`;
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid pipeline path");
  }
  return resolved;
}

export function isValidRequirementPipelineId(id: string): boolean {
  const trimmed = id.trim();
  return REQUIREMENT_PIPELINE_ID_RE.test(trimmed);
}

function assertRequirementPipelineId(id: string): void {
  if (!isValidRequirementPipelineId(id)) {
    throw new Error("Invalid pipeline id");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizePriority(value: unknown): TaskPriority {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (rounded >= 1 && rounded <= 5) return rounded as TaskPriority;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed as TaskPriority;
    }
    const lowered = value.trim().toLowerCase();
    if (lowered === "high" || lowered === "p1") return 1;
    if (lowered === "medium" || lowered === "p2") return 3;
    if (lowered === "low" || lowered === "p3") return 4;
  }
  return 3;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => Boolean(item));
}

function stripCodeFence(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

function parseLooseJson(raw: string): unknown {
  const cleaned = stripCodeFence(raw);
  if (!cleaned) throw new Error("Planner returned empty output");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObj = cleaned.indexOf("{");
    const lastObj = cleaned.lastIndexOf("}");
    if (firstObj >= 0 && lastObj > firstObj) {
      return JSON.parse(cleaned.slice(firstObj, lastObj + 1));
    }
    throw new Error("Planner output is not valid JSON");
  }
}

function summarizeDrafts(tasks: RequirementTaskDraft[]): string {
  if (tasks.length === 0) return "No executable tasks were extracted.";
  const top = tasks.slice(0, 3).map((task) => task.title).join(" / ");
  return `Split into ${tasks.length} tasks. Top focus: ${top}`;
}

async function ensurePipelineDir(): Promise<void> {
  await fs.mkdir(REQUIREMENT_PIPELINES_DIR, { recursive: true });
}

async function readPipelineState(id: string): Promise<RequirementPipelineState | null> {
  const filePath = pipelinePath(id);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as RequirementPipelineState;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function writePipelineState(state: RequirementPipelineState): Promise<void> {
  await ensurePipelineDir();
  await fs.writeFile(pipelinePath(state.id), JSON.stringify(state, null, 2), "utf8");
}

async function patchPipelineTask(
  pipelineId: string,
  taskId: string,
  updates: Partial<RequirementPipelineTask>
): Promise<void> {
  const state = await readPipelineState(pipelineId);
  if (!state) return;
  const nextTasks = state.tasks.map((task) =>
    task.taskId === taskId ? { ...task, ...updates } : task
  );
  const nextState: RequirementPipelineState = {
    ...state,
    tasks: nextTasks,
    updatedAt: nowIso(),
  };
  await writePipelineState(nextState);
}

function buildRequirementBreakdownPrompt(input: {
  requirement: string;
  maxTasks: number;
  agents: Array<{ slug: string; name: string; role: string; department: string; focus: string[] }>;
}): string {
  const agentLines = input.agents.map((agent) => {
    const focus = agent.focus.length ? agent.focus.join(", ") : "(no focus set)";
    return `- ${agent.slug}: ${agent.name} | ${agent.role} | dept=${agent.department} | focus=${focus}`;
  });

  return `You are a technical program manager. Convert this requirement into executable agent tasks.

Requirement:
${input.requirement}

Available agents:
${agentLines.join("\n")}

Return ONLY valid JSON with this schema:
{
  "summary": "one-paragraph plan summary",
  "tasks": [
    {
      "title": "clear task title",
      "description": "what to do and expected output",
      "agentSlug": "one of available agent slugs",
      "priority": 1,
      "acceptanceCriteria": ["verifiable outcome 1", "verifiable outcome 2"],
      "dependsOn": ["task title this depends on"]
    }
  ]
}

Rules:
- Output at most ${input.maxTasks} tasks.
- Keep tasks independent where possible, but include dependsOn when needed.
- Use concrete, testable acceptance criteria.
- Priority range must be 1-5 (1 highest).
- Do not use markdown or code fences.`;
}

function normalizeTaskDrafts(
  value: unknown,
  allowedAgentSlugs: Set<string>,
  fallbackAgent: string,
  maxTasks: number
): RequirementTaskDraft[] {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.tasks)) return [];

  const drafts: RequirementTaskDraft[] = [];
  for (const item of root.tasks) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = asString(row.title, "Untitled task");
    const description = asString(row.description, "No description provided");
    const requestedSlug = asString(row.agentSlug, fallbackAgent);
    const agentSlug = allowedAgentSlugs.has(requestedSlug) ? requestedSlug : fallbackAgent;
    const acceptanceCriteria = asStringArray(row.acceptanceCriteria).slice(0, 6);
    const dependsOn = asStringArray(row.dependsOn).slice(0, 6);
    drafts.push({
      title,
      description,
      agentSlug,
      priority: normalizePriority(row.priority),
      acceptanceCriteria,
      dependsOn,
    });
  }

  return drafts.slice(0, maxTasks);
}

function buildExecutionUserMessage(input: {
  requirement: string;
  draft: RequirementTaskDraft;
  pipelineId: string;
}): string {
  const acceptanceLines = input.draft.acceptanceCriteria.length
    ? input.draft.acceptanceCriteria.map((line) => `- ${line}`).join("\n")
    : "- Deliver a concrete result and summarize verification steps.";
  const dependencyLines = input.draft.dependsOn.length
    ? input.draft.dependsOn.map((line) => `- ${line}`).join("\n")
    : "- None";

  return [
    `Pipeline ID: ${input.pipelineId}`,
    `Original requirement: ${input.requirement}`,
    "",
    `Assigned task: ${input.draft.title}`,
    input.draft.description,
    "",
    "Acceptance criteria:",
    acceptanceLines,
    "",
    "Dependencies:",
    dependencyLines,
    "",
    "Please execute this task end-to-end and report concrete outcomes plus remaining risks.",
  ].join("\n");
}

async function onTaskConversationComplete(input: {
  pipelineId: string;
  taskId: string;
  agentSlug: string;
  title: string;
  channel: string;
  completion: ConversationCompletion;
}): Promise<void> {
  const status = input.completion.status === "completed" ? "completed" : "failed";
  const result =
    input.completion.meta.summary ||
    input.completion.output.split("\n").map((line) => line.trim()).find(Boolean) ||
    (status === "completed" ? "Task completed." : "Task failed.");

  await updateTask(input.agentSlug, input.taskId, {
    status,
    result,
  });
  await patchPipelineTask(input.pipelineId, input.taskId, { status, result });

  const prefix = status === "completed" ? "✅" : "❌";
  await postSystemMessage(
    input.channel,
    `${prefix} [${input.pipelineId}] ${input.agentSlug} ${input.title}：${result}`
  ).catch(() => {});
}

export async function listRequirementPipelines(limit = 30): Promise<RequirementPipelineState[]> {
  await ensurePipelineDir();
  const entries = await fs.readdir(REQUIREMENT_PIPELINES_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const states: RequirementPipelineState[] = [];

  for (const file of files) {
    const id = file.name.replace(/\.json$/, "");
    if (!isValidRequirementPipelineId(id)) continue;
    const state = await readPipelineState(id);
    if (state) states.push(state);
  }

  return states
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getRequirementPipeline(id: string): Promise<RequirementPipelineState | null> {
  const state = await readPipelineState(id);
  if (!state) return null;

  const refreshedTasks: RequirementPipelineTask[] = [];
  for (const task of state.tasks) {
    const latest = await getTask(task.agentSlug, task.taskId);
    if (!latest) {
      refreshedTasks.push(task);
      continue;
    }
    refreshedTasks.push({
      ...task,
      status: latest.status,
      result: latest.result,
    });
  }

  const refreshedState: RequirementPipelineState = {
    ...state,
    tasks: refreshedTasks,
    updatedAt: nowIso(),
  };
  await writePipelineState(refreshedState);
  return refreshedState;
}

export async function runRequirementPipeline(
  input: RequirementPipelineInput
): Promise<RequirementPipelineState> {
  const requirement = input.requirement.trim();
  if (!requirement) {
    throw new Error("requirement is required");
  }

  const personas = await listPersonas();
  if (personas.length === 0) {
    throw new Error("No agents are configured");
  }

  const activePersonas = personas.filter((persona) => persona.active);
  const plannerAgentList = (activePersonas.length > 0 ? activePersonas : personas).map((persona) => ({
    slug: persona.slug,
    name: persona.name,
    role: persona.role,
    department: persona.department || "general",
    focus: persona.focus || [],
  }));

  const maxTasks =
    typeof input.maxTasks === "number" && input.maxTasks > 0
      ? Math.min(Math.floor(input.maxTasks), 20)
      : DEFAULT_TASK_LIMIT;
  const channel = asString(input.channel, "general");
  const autoRun = input.autoRun !== false;
  const fallbackAgent = plannerAgentList[0]?.slug || "general";
  const allowedAgentSlugs = new Set(plannerAgentList.map((item) => item.slug));

  const prompt = buildRequirementBreakdownPrompt({
    requirement,
    maxTasks,
    agents: plannerAgentList,
  });
  const plannerRaw = await runOneShotProviderPrompt({
    providerId: input.providerId,
    prompt,
    cwd: DATA_DIR,
    timeoutMs: 180_000,
  });

  const parsed = parseLooseJson(plannerRaw);
  const taskDrafts = normalizeTaskDrafts(parsed, allowedAgentSlugs, fallbackAgent, maxTasks);
  if (taskDrafts.length === 0) {
    throw new Error("Planner did not return executable tasks");
  }

  const summary =
    parsed && typeof parsed === "object"
      ? asString((parsed as Record<string, unknown>).summary, summarizeDrafts(taskDrafts))
      : summarizeDrafts(taskDrafts);

  const pipelineId = `req-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createdAt = nowIso();

  const tasks: RequirementPipelineTask[] = [];
  for (const draft of taskDrafts) {
    const created = await createTask({
      fromAgent: "planner",
      fromEmoji: "🧭",
      fromName: "Requirement Planner",
      toAgent: draft.agentSlug,
      channel,
      title: draft.title,
      description: draft.description,
      kbRefs: [],
      priority: draft.priority,
    });

    tasks.push({
      taskId: created.id,
      title: draft.title,
      description: draft.description,
      agentSlug: draft.agentSlug,
      priority: draft.priority,
      acceptanceCriteria: draft.acceptanceCriteria,
      dependsOn: draft.dependsOn,
      status: created.status,
    });
  }

  const initialState: RequirementPipelineState = {
    id: pipelineId,
    createdAt,
    updatedAt: createdAt,
    requirement,
    channel,
    autoRun,
    summary,
    tasks,
  };
  await writePipelineState(initialState);

  await postSystemMessage(
    channel,
    `🧩 [${pipelineId}] 已拆解 ${tasks.length} 个任务，${autoRun ? "开始自动执行" : "等待手动执行"}。`
  ).catch(() => {});

  if (!autoRun) {
    return initialState;
  }

  for (const draft of tasks) {
    await updateTask(draft.agentSlug, draft.taskId, { status: "in_progress" });
    await patchPipelineTask(pipelineId, draft.taskId, { status: "in_progress" });

    const executionMessage = buildExecutionUserMessage({
      requirement,
      draft,
      pipelineId,
    });

    try {
      const built = await buildManualConversationPrompt({
        agentSlug: draft.agentSlug,
        userMessage: executionMessage,
        mentionedPaths: [],
      });

      const conversation = await startConversationRun({
        agentSlug: draft.agentSlug,
        title: `Pipeline ${pipelineId}: ${draft.title}`,
        trigger: "manual",
        prompt: built.prompt,
        providerId: built.providerId,
        cwd: built.cwd,
        onComplete: async (completion) => {
          await onTaskConversationComplete({
            pipelineId,
            taskId: draft.taskId,
            agentSlug: draft.agentSlug,
            title: draft.title,
            channel,
            completion,
          });
        },
      });

      await patchPipelineTask(pipelineId, draft.taskId, {
        conversationId: conversation.id,
        status: "in_progress",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start execution";
      await updateTask(draft.agentSlug, draft.taskId, {
        status: "failed",
        result: message,
      });
      await patchPipelineTask(pipelineId, draft.taskId, {
        status: "failed",
        result: message,
      });
      await postSystemMessage(
        channel,
        `❌ [${pipelineId}] ${draft.agentSlug} ${draft.title} 启动失败：${message}`
      ).catch(() => {});
    }
  }

  return (await getRequirementPipeline(pipelineId)) || initialState;
}
