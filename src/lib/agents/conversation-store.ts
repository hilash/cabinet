import fs from "fs/promises";
import path from "path";
import type {
  ConversationArtifact,
  ConversationDetail,
  ConversationMeta,
  ConversationStatus,
  ConversationTrigger,
} from "../../types/conversations";
import { DATA_DIR, sanitizeFilename, virtualPathFromFs } from "../storage/path-utils";
import {
  ensureDirectory,
  fileExists,
  listDirectory,
  readFileContent,
  writeFileContent,
} from "../storage/fs-operations";

export const CONVERSATIONS_DIR = path.join(DATA_DIR, ".agents", ".conversations");

interface CreateConversationInput {
  agentSlug: string;
  title: string;
  trigger: ConversationTrigger;
  prompt: string;
  mentionedPaths?: string[];
  jobId?: string;
  jobName?: string;
  startedAt?: string;
}

interface ListConversationFilters {
  agentSlug?: string;
  trigger?: ConversationTrigger;
  status?: ConversationStatus;
  pagePath?: string;
  limit?: number;
}

interface ParsedCabinetBlock {
  summary?: string;
  contextSummary?: string;
  artifactPaths: string[];
}

function formatTimestampSegment(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sanitizeSegment(value: string, fallback: string): string {
  return sanitizeFilename(value) || fallback;
}

function conversationDir(id: string): string {
  return path.join(CONVERSATIONS_DIR, id);
}

function metaPath(id: string): string {
  return path.join(conversationDir(id), "meta.json");
}

function transcriptPathFs(id: string): string {
  return path.join(conversationDir(id), "transcript.txt");
}

function promptPathFs(id: string): string {
  return path.join(conversationDir(id), "prompt.md");
}

function mentionsPathFs(id: string): string {
  return path.join(conversationDir(id), "mentions.json");
}

function artifactsPathFs(id: string): string {
  return path.join(conversationDir(id), "artifacts.json");
}

function makeSummaryFromOutput(output: string): string | undefined {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("```"));
  return lines[0]?.slice(0, 300);
}

function normalizeArtifactPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/data/")) {
    return trimmed.replace(/^\/data\//, "");
  }

  if (trimmed.startsWith(DATA_DIR)) {
    return virtualPathFromFs(trimmed);
  }

  const normalized = trimmed.replace(/^\.?\//, "");
  if (!normalized || normalized.startsWith("..")) return null;
  return normalized;
}

export function parseCabinetBlock(output: string): ParsedCabinetBlock {
  const match = output.match(/```cabinet\s*([\s\S]*?)```/i);
  if (!match) {
    return { artifactPaths: [] };
  }

  const lines = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const artifactPaths: string[] = [];
  let summary = "";
  let contextSummary = "";

  for (const line of lines) {
    if (line.startsWith("SUMMARY:")) {
      summary = line.slice("SUMMARY:".length).trim();
      continue;
    }
    if (line.startsWith("CONTEXT:")) {
      contextSummary = line.slice("CONTEXT:".length).trim();
      continue;
    }
    if (line.startsWith("ARTIFACT:")) {
      const normalized = normalizeArtifactPath(line.slice("ARTIFACT:".length));
      if (normalized && !artifactPaths.includes(normalized)) {
        artifactPaths.push(normalized);
      }
    }
  }

  return {
    summary: summary || undefined,
    contextSummary: contextSummary || undefined,
    artifactPaths,
  };
}

export function buildConversationId(input: {
  agentSlug: string;
  trigger: ConversationTrigger;
  jobName?: string;
  now?: Date;
}): string {
  const now = input.now || new Date();
  const parts = [
    formatTimestampSegment(now),
    sanitizeSegment(input.agentSlug, "agent"),
    input.trigger,
  ];

  if (input.trigger === "job" && input.jobName) {
    parts.push(sanitizeSegment(input.jobName, "job"));
  }

  return parts.join("-");
}

export async function ensureConversationsDir(): Promise<void> {
  await ensureDirectory(CONVERSATIONS_DIR);
}

export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationMeta> {
  await ensureConversationsDir();

  const startedAt = input.startedAt || new Date().toISOString();
  const id = buildConversationId({
    agentSlug: input.agentSlug,
    trigger: input.trigger,
    jobName: input.jobName || input.jobId,
    now: new Date(startedAt),
  });
  const dir = conversationDir(id);
  await ensureDirectory(dir);

  const meta: ConversationMeta = {
    id,
    agentSlug: input.agentSlug,
    title: input.title,
    trigger: input.trigger,
    status: "running",
    startedAt,
    jobId: input.jobId,
    jobName: input.jobName,
    promptPath: virtualPathFromFs(promptPathFs(id)),
    transcriptPath: virtualPathFromFs(transcriptPathFs(id)),
    mentionedPaths: input.mentionedPaths || [],
    artifactPaths: [],
  };

  await Promise.all([
    writeFileContent(promptPathFs(id), input.prompt),
    writeFileContent(transcriptPathFs(id), ""),
    writeFileContent(
      mentionsPathFs(id),
      JSON.stringify(input.mentionedPaths || [], null, 2)
    ),
    writeFileContent(artifactsPathFs(id), JSON.stringify([], null, 2)),
    writeFileContent(metaPath(id), JSON.stringify(meta, null, 2)),
  ]);

  return meta;
}

export async function readConversationMeta(
  id: string
): Promise<ConversationMeta | null> {
  const filePath = metaPath(id);
  if (!(await fileExists(filePath))) return null;
  try {
    const raw = await readFileContent(filePath);
    return JSON.parse(raw) as ConversationMeta;
  } catch {
    return null;
  }
}

export async function writeConversationMeta(meta: ConversationMeta): Promise<void> {
  await ensureDirectory(conversationDir(meta.id));
  await writeFileContent(metaPath(meta.id), JSON.stringify(meta, null, 2));
}

export async function appendConversationTranscript(
  id: string,
  chunk: string
): Promise<void> {
  await ensureDirectory(conversationDir(id));
  await fs.appendFile(transcriptPathFs(id), chunk, "utf-8");
}

export async function replaceConversationArtifacts(
  id: string,
  artifacts: ConversationArtifact[]
): Promise<void> {
  await ensureDirectory(conversationDir(id));
  await writeFileContent(artifactsPathFs(id), JSON.stringify(artifacts, null, 2));
}

export async function finalizeConversation(
  id: string,
  input: {
    status: ConversationStatus;
    exitCode?: number | null;
    output?: string;
  }
): Promise<ConversationMeta | null> {
  const meta = await readConversationMeta(id);
  if (!meta) return null;

  const output = input.output ?? (await readConversationTranscript(id));
  const parsed = parseCabinetBlock(output);
  const artifacts = parsed.artifactPaths.map((artifactPath) => ({
    path: artifactPath,
  }));

  meta.status = input.status;
  meta.completedAt = new Date().toISOString();
  meta.exitCode = input.exitCode ?? null;
  meta.summary = parsed.summary || makeSummaryFromOutput(output);
  meta.contextSummary = parsed.contextSummary;
  meta.artifactPaths = artifacts.map((artifact) => artifact.path);

  await Promise.all([
    writeConversationMeta(meta),
    replaceConversationArtifacts(id, artifacts),
  ]);

  return meta;
}

export async function readConversationTranscript(id: string): Promise<string> {
  const filePath = transcriptPathFs(id);
  if (!(await fileExists(filePath))) return "";
  return readFileContent(filePath);
}

export async function readConversationDetail(
  id: string
): Promise<ConversationDetail | null> {
  const meta = await readConversationMeta(id);
  if (!meta) return null;

  const [hasPrompt, hasMentions, hasArtifacts] = await Promise.all([
    fileExists(promptPathFs(id)),
    fileExists(mentionsPathFs(id)),
    fileExists(artifactsPathFs(id)),
  ]);

  const [prompt, transcript, mentionsRaw, artifactsRaw] = await Promise.all([
    hasPrompt ? readFileContent(promptPathFs(id)) : Promise.resolve(""),
    readConversationTranscript(id),
    hasMentions ? readFileContent(mentionsPathFs(id)) : Promise.resolve("[]"),
    hasArtifacts ? readFileContent(artifactsPathFs(id)) : Promise.resolve("[]"),
  ]);

  let mentions: string[] = [];
  let artifacts: ConversationArtifact[] = [];

  try {
    mentions = JSON.parse(mentionsRaw) as string[];
  } catch {
    mentions = [];
  }

  try {
    artifacts = JSON.parse(artifactsRaw) as ConversationArtifact[];
  } catch {
    artifacts = [];
  }

  return {
    meta,
    prompt,
    transcript,
    mentions,
    artifacts,
  };
}

export async function listConversationMetas(
  filters: ListConversationFilters = {}
): Promise<ConversationMeta[]> {
  await ensureConversationsDir();
  const entries = await listDirectory(CONVERSATIONS_DIR);

  const metas = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory)
        .map((entry) => readConversationMeta(entry.name))
    )
  ).filter(Boolean) as ConversationMeta[];

  const filtered = metas.filter((meta) => {
    if (filters.agentSlug && meta.agentSlug !== filters.agentSlug) return false;
    if (filters.trigger && meta.trigger !== filters.trigger) return false;
    if (filters.status && meta.status !== filters.status) return false;
    if (filters.pagePath && !meta.mentionedPaths.includes(filters.pagePath)) return false;
    return true;
  });

  filtered.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return filtered.slice(0, filters.limit || 200);
}

export async function getRunningConversationCounts(): Promise<Record<string, number>> {
  const running = await listConversationMetas({ status: "running", limit: 1000 });
  return running.reduce<Record<string, number>>((acc, meta) => {
    acc[meta.agentSlug] = (acc[meta.agentSlug] || 0) + 1;
    return acc;
  }, {});
}
