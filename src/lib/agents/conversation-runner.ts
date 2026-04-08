import type { JobConfig, JobRun, JobPostAction } from "@/types/jobs";
import type { ConversationMeta } from "@/types/conversations";
import { readPage } from "../storage/page-io";
import { DATA_DIR } from "../storage/path-utils";
import {
  appendConversationTranscript,
  createConversation,
  finalizeConversation,
  readConversationMeta,
} from "./conversation-store";
import { createDaemonSession, getDaemonSessionOutput } from "./daemon-client";
import { readPersona, type AgentPersona } from "./persona-manager";
import { getDefaultProviderId } from "./provider-runtime";

export interface ConversationCompletion {
  meta: ConversationMeta;
  output: string;
  status: "completed" | "failed";
}

interface StartConversationInput {
  agentSlug: string;
  title: string;
  trigger: ConversationMeta["trigger"];
  prompt: string;
  providerId?: string;
  mentionedPaths?: string[];
  jobId?: string;
  jobName?: string;
  cwd?: string;
  allowedRoots?: string[];
  timeoutSeconds?: number;
  onComplete?: (completion: ConversationCompletion) => Promise<void> | void;
}

function buildCabinetEpilogueInstructions(): string {
  return [
    "At the end of your response, include a ```cabinet block with these fields:",
    "SUMMARY: one short summary line",
    "CONTEXT: optional lightweight memory/context summary",
    "ARTIFACT: relative/path/to/file for every KB file you created or updated",
  ].join("\n");
}

function buildAgentContextHeader(persona: AgentPersona | null, agentSlug: string): string {
  if (!persona) {
    return [
      "You are Cabinet's General agent.",
      "Handle the request directly and use the knowledge base as your working area.",
    ].join("\n");
  }

  return [
    persona.body,
    "",
    `You are working as ${persona.name} (${agentSlug}).`,
  ].join("\n");
}

function makeTitle(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || "New conversation";
  return firstLine.slice(0, 80);
}

async function buildMentionContext(mentionedPaths: string[]): Promise<string> {
  if (mentionedPaths.length === 0) return "";

  const chunks = await Promise.all(
    mentionedPaths.map(async (pagePath) => {
      try {
        const page = await readPage(pagePath);
        return `--- ${page.frontmatter.title} (${pagePath}) ---\n${page.content}`;
      } catch {
        return null;
      }
    })
  );

  const valid = chunks.filter(Boolean);
  if (valid.length === 0) return "";

  return `\n\nReferenced pages:\n${valid.join("\n\n")}`;
}

export async function buildManualConversationPrompt(input: {
  agentSlug: string;
  userMessage: string;
  mentionedPaths?: string[];
}): Promise<{
  prompt: string;
  title: string;
  cwd?: string;
  allowedRoots: string[];
  providerId: string;
}> {
  const persona = input.agentSlug === "general"
    ? null
    : await readPersona(input.agentSlug);
  const mentionContext = await buildMentionContext(input.mentionedPaths || []);
  const cwd =
    persona?.workdir && persona.workdir !== "/data"
      ? `${DATA_DIR}/${persona.workdir.replace(/^\/+/, "")}`
      : DATA_DIR;

  const prompt = [
    buildAgentContextHeader(persona, input.agentSlug),
    "",
    "Work in the Cabinet knowledge base at /data.",
    "Reflect useful outputs in KB files, not only in terminal text.",
    buildCabinetEpilogueInstructions(),
    "",
    `User request:\n${input.userMessage}${mentionContext}`,
  ].join("\n");

  return {
    prompt,
    title: makeTitle(input.userMessage),
    cwd,
    allowedRoots: [DATA_DIR],
    providerId: persona?.provider || getDefaultProviderId(),
  };
}

export async function buildEditorConversationPrompt(input: {
  pagePath: string;
  userMessage: string;
  mentionedPaths?: string[];
}): Promise<{
  prompt: string;
  title: string;
  cwd?: string;
  allowedRoots: string[];
  mentionedPaths: string[];
  providerId: string;
}> {
  const persona = await readPersona("editor");
  const combinedMentionedPaths = Array.from(
    new Set([input.pagePath, ...(input.mentionedPaths || [])])
  );
  const mentionContext = await buildMentionContext(combinedMentionedPaths);
  const cwd =
    persona?.workdir && persona.workdir !== "/data"
      ? `${DATA_DIR}/${persona.workdir.replace(/^\/+/, "")}`
      : DATA_DIR;

  const prompt = [
    buildAgentContextHeader(persona, "editor"),
    "",
    `You are editing the page at /data/${input.pagePath}.`,
    `Prefer making the requested changes directly in ${input.pagePath} unless the task clearly belongs in another KB file.`,
    "Work in the Cabinet knowledge base at /data.",
    "Edit KB files directly and reflect useful outputs in the KB, not only in terminal text.",
    buildCabinetEpilogueInstructions(),
    "",
    `User request:\n${input.userMessage}${mentionContext}`,
  ].join("\n");

  return {
    prompt,
    title: makeTitle(input.userMessage),
    cwd,
    allowedRoots: [DATA_DIR],
    mentionedPaths: combinedMentionedPaths,
    providerId: persona?.provider || getDefaultProviderId(),
  };
}

export async function startConversationRun(
  input: StartConversationInput
): Promise<ConversationMeta> {
  const meta = await createConversation({
    agentSlug: input.agentSlug,
    title: input.title,
    trigger: input.trigger,
    prompt: input.prompt,
    mentionedPaths: input.mentionedPaths,
    jobId: input.jobId,
    jobName: input.jobName,
  });

  try {
    await createDaemonSession({
      id: meta.id,
      prompt: input.prompt,
      providerId: input.providerId,
      cwd: input.cwd,
      allowedRoots: input.allowedRoots,
      timeoutSeconds: input.timeoutSeconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start daemon session";
    await appendConversationTranscript(meta.id, `${message}\n`);
    await finalizeConversation(meta.id, {
      status: "failed",
      output: message,
      exitCode: 1,
    });
    throw error;
  }

  if (input.onComplete) {
    void waitForConversationCompletion(meta.id, input.onComplete);
  }

  return meta;
}

export async function waitForConversationCompletion(
  conversationId: string,
  onComplete?: (completion: ConversationCompletion) => Promise<void> | void
): Promise<ConversationCompletion> {
  const deadline = Date.now() + 15 * 60 * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const data = await getDaemonSessionOutput(conversationId);
      if (data.status === "running") {
        continue;
      }

      const normalizedStatus = data.status === "completed" ? "completed" : "failed";
      const currentMeta = await readConversationMeta(conversationId);
      const finalMeta =
        currentMeta?.status === "running"
          ? await finalizeConversation(conversationId, {
              status: normalizedStatus,
              output: data.output,
              exitCode: normalizedStatus === "completed" ? 0 : 1,
            })
          : currentMeta;

      if (!finalMeta) {
        throw new Error(`Conversation ${conversationId} disappeared during completion`);
      }

      const completion = {
        meta: finalMeta,
        output: data.output,
        status: normalizedStatus,
      } satisfies ConversationCompletion;

      if (onComplete) {
        await onComplete(completion);
      }

      return completion;
    } catch {
      // Retry until timeout. The daemon can briefly 404 while cleaning up.
    }
  }

  const finalMeta = await finalizeConversation(conversationId, {
    status: "failed",
    output: "Conversation timed out while waiting for completion.",
    exitCode: 124,
  });

  if (!finalMeta) {
    throw new Error(`Conversation ${conversationId} timed out and no metadata was found`);
  }

  const completion = {
    meta: finalMeta,
    output: "Conversation timed out while waiting for completion.",
    status: "failed",
  } satisfies ConversationCompletion;

  if (onComplete) {
    await onComplete(completion);
  }

  return completion;
}

function substituteTemplateVars(text: string, job: JobConfig): string {
  const now = new Date();
  return text
    .replace(/\{\{date\}\}/g, now.toISOString().split("T")[0])
    .replace(/\{\{datetime\}\}/g, now.toISOString())
    .replace(/\{\{job\.name\}\}/g, job.name)
    .replace(/\{\{job\.id\}\}/g, job.id)
    .replace(/\{\{job\.workdir\}\}/g, job.workdir || "/data");
}

async function processPostActions(
  actions: JobPostAction[] | undefined,
  job: JobConfig
): Promise<void> {
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      if (action.action === "git_commit") {
        const simpleGit = (await import("simple-git")).default;
        const git = simpleGit(DATA_DIR);
        await git.add(".");
        await git.commit(
          substituteTemplateVars(
            action.message || `Job ${job.name} completed {{date}}`,
            job
          )
        );
      }
    } catch (error) {
      console.error(`Post-action ${action.action} failed:`, error);
    }
  }
}

export async function startJobConversation(job: JobConfig): Promise<JobRun> {
  const persona = job.agentSlug ? await readPersona(job.agentSlug) : null;
  const jobPrompt = substituteTemplateVars(job.prompt, job);
  const cwd =
    job.workdir && job.workdir !== "/data"
      ? `${DATA_DIR}/${job.workdir.replace(/^\/+/, "")}`
      : persona?.workdir && persona.workdir !== "/data"
        ? `${DATA_DIR}/${persona.workdir.replace(/^\/+/, "")}`
        : DATA_DIR;

  const prompt = [
    buildAgentContextHeader(persona, job.agentSlug || "agent"),
    "",
    "This is a scheduled or manual Cabinet job.",
    "Reflect the results in KB files whenever useful.",
    buildCabinetEpilogueInstructions(),
    "",
    `Job instructions:\n${jobPrompt}`,
  ].join("\n");

  const meta = await startConversationRun({
    agentSlug: job.agentSlug || "agent",
    title: job.name,
    trigger: "job",
    prompt,
    providerId: job.provider || persona?.provider || getDefaultProviderId(),
    allowedRoots: [DATA_DIR],
    jobId: job.id,
    jobName: job.name,
    cwd,
    timeoutSeconds: job.timeout || 600,
    onComplete: async (completion) => {
      if (completion.status === "completed") {
        await processPostActions(job.on_complete, job);
      } else {
        await processPostActions(job.on_failure, job);
      }
    },
  });

  return {
    id: meta.id,
    jobId: job.id,
    status: "running",
    startedAt: meta.startedAt,
    output: "",
  };
}
