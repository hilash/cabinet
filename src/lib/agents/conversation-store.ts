import fs from "fs/promises";
import path from "path";
import type {
  ConversationArtifact,
  ConversationDetail,
  ConversationMeta,
  ConversationStatus,
  ConversationTrigger,
} from "../../types/conversations";
import { discoverCabinetPaths } from "../cabinets/discovery";
import { DATA_DIR, sanitizeFilename, virtualPathFromFs } from "../storage/path-utils";
import {
  deleteFileOrDir,
  ensureDirectory,
  fileExists,
  listDirectory,
  readFileContent,
  writeFileContent,
} from "../storage/fs-operations";

export const CONVERSATIONS_DIR = path.join(DATA_DIR, ".agents", ".conversations");

function resolveConversationsDir(cabinetPath?: string): string {
  if (cabinetPath) return path.join(DATA_DIR, cabinetPath, ".agents", ".conversations");
  return CONVERSATIONS_DIR;
}

// ── In-memory notification queue for completed/failed conversations ──
export interface ConversationNotification {
  id: string;
  agentSlug: string;
  cabinetPath?: string;
  title: string;
  status: ConversationStatus;
  summary?: string;
  completedAt: string;
}

const notificationQueue: ConversationNotification[] = [];

export function drainConversationNotifications(): ConversationNotification[] {
  return notificationQueue.splice(0, notificationQueue.length);
}

interface CreateConversationInput {
  agentSlug: string;
  cabinetPath?: string;
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
  cabinetPath?: string;
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

const PLACEHOLDER_SUMMARY = "one short summary line";
const PLACEHOLDER_CONTEXT = "optional lightweight memory/context summary";
const PLACEHOLDER_ARTIFACT_HINT = "relative/path/to/file for every KB file you created or updated";

function formatTimestampSegment(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sanitizeSegment(value: string, fallback: string): string {
  return sanitizeFilename(value) || fallback;
}

function conversationDir(id: string, cabinetPath?: string): string {
  return path.join(resolveConversationsDir(cabinetPath), id);
}

function metaPath(id: string, cabinetPath?: string): string {
  return path.join(conversationDir(id, cabinetPath), "meta.json");
}

function transcriptPathFs(id: string, cabinetPath?: string): string {
  return path.join(conversationDir(id, cabinetPath), "transcript.txt");
}

function promptPathFs(id: string, cabinetPath?: string): string {
  return path.join(conversationDir(id, cabinetPath), "prompt.md");
}

function mentionsPathFs(id: string, cabinetPath?: string): string {
  return path.join(conversationDir(id, cabinetPath), "mentions.json");
}

function artifactsPathFs(id: string, cabinetPath?: string): string {
  return path.join(conversationDir(id, cabinetPath), "artifacts.json");
}

function makeSummaryFromOutput(output: string): string | undefined {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("```"));
  return lines[0]?.slice(0, 300);
}

export function extractConversationRequest(prompt: string): string {
  const normalized = prompt.replace(/\r+/g, "\n");
  const markers = ["User request:\n", "Job instructions:\n"];

  for (const marker of markers) {
    const index = normalized.lastIndexOf(marker);
    if (index !== -1) {
      return normalized.slice(index + marker.length).trim();
    }
  }

  return normalized.trim();
}

function normalizeArtifactPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (trimmed === PLACEHOLDER_ARTIFACT_HINT) return null;
  if (trimmed.includes("for every KB file")) return null;

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

function sanitizeCabinetFieldValue(value: string): string {
  return value
    .replace(/\s*❯\s*$/g, "")
    .replace(/\s*[─-]{8,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlaceholderCabinetValue(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === PLACEHOLDER_SUMMARY ||
    normalized === PLACEHOLDER_CONTEXT ||
    normalized === PLACEHOLDER_ARTIFACT_HINT
  );
}

export function parseCabinetBlock(output: string, prompt?: string): ParsedCabinetBlock {
  const cleaned = cleanConversationOutputForParsing(output, prompt);
  const matches = Array.from(cleaned.matchAll(/```cabinet\s*([\s\S]*?)```/gi));
  const match = matches.at(-1);
  const artifactPaths: string[] = [];
  let summary = "";
  let contextSummary = "";

  if (match) {
    const lines = match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("SUMMARY:")) {
        summary = sanitizeCabinetFieldValue(line.slice("SUMMARY:".length));
        continue;
      }
      if (line.startsWith("CONTEXT:")) {
        contextSummary = sanitizeCabinetFieldValue(line.slice("CONTEXT:".length));
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
      summary: summary && !isPlaceholderCabinetValue(summary) ? summary : undefined,
      contextSummary:
        contextSummary && !isPlaceholderCabinetValue(contextSummary)
          ? contextSummary
          : undefined,
      artifactPaths,
    };
  }

  const fieldMatches = Array.from(
    cleaned.matchAll(/(?:^|\n)\s*(SUMMARY|CONTEXT|ARTIFACT):\s*(.*)$/gm)
  );
  if (fieldMatches.length === 0) {
    return { artifactPaths: [] };
  }

  const lastSummaryMatch = [...fieldMatches].reverse().find((entry) => entry[1] === "SUMMARY");
  const relevantStart = lastSummaryMatch?.index ?? 0;

  for (const entry of fieldMatches) {
    if ((entry.index ?? 0) < relevantStart) continue;

    const field = entry[1];
    const value = sanitizeCabinetFieldValue(entry[2] || "");
    if (field === "SUMMARY") {
      summary = value;
      continue;
    }
    if (field === "CONTEXT") {
      contextSummary = value;
      continue;
    }
    if (field === "ARTIFACT") {
      const normalized = normalizeArtifactPath(value);
      if (normalized && !artifactPaths.includes(normalized)) {
        artifactPaths.push(normalized);
      }
    }
  }

  return {
    summary: summary && !isPlaceholderCabinetValue(summary) ? summary : undefined,
    contextSummary:
      contextSummary && !isPlaceholderCabinetValue(contextSummary)
        ? contextSummary
        : undefined,
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

export async function ensureConversationsDir(cabinetPath?: string): Promise<void> {
  await ensureDirectory(resolveConversationsDir(cabinetPath));
}

export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationMeta> {
  await ensureConversationsDir(input.cabinetPath);

  const startedAt = input.startedAt || new Date().toISOString();
  const id = buildConversationId({
    agentSlug: input.agentSlug,
    trigger: input.trigger,
    jobName: input.jobName || input.jobId,
    now: new Date(startedAt),
  });
  const cp = input.cabinetPath;
  const dir = conversationDir(id, cp);
  await ensureDirectory(dir);

  const meta: ConversationMeta = {
    id,
    agentSlug: input.agentSlug,
    cabinetPath: cp,
    title: input.title,
    trigger: input.trigger,
    status: "running",
    startedAt,
    jobId: input.jobId,
    jobName: input.jobName,
    promptPath: virtualPathFromFs(promptPathFs(id, cp)),
    transcriptPath: virtualPathFromFs(transcriptPathFs(id, cp)),
    mentionedPaths: input.mentionedPaths || [],
    artifactPaths: [],
  };

  await Promise.all([
    writeFileContent(promptPathFs(id, cp), input.prompt),
    writeFileContent(transcriptPathFs(id, cp), ""),
    writeFileContent(
      mentionsPathFs(id, cp),
      JSON.stringify(input.mentionedPaths || [], null, 2)
    ),
    writeFileContent(artifactsPathFs(id, cp), JSON.stringify([], null, 2)),
    writeFileContent(metaPath(id, cp), JSON.stringify(meta, null, 2)),
  ]);

  return meta;
}

export async function readConversationMeta(
  id: string,
  cabinetPath?: string
): Promise<ConversationMeta | null> {
  const resolvedCabinetPath = await resolveConversationCabinetPath(id, cabinetPath);
  if (resolvedCabinetPath === null) return null;

  const filePath = metaPath(id, resolvedCabinetPath);
  try {
    const raw = await readFileContent(filePath);
    const parsed = JSON.parse(raw) as ConversationMeta;
    if (!parsed.cabinetPath && typeof resolvedCabinetPath === "string") {
      parsed.cabinetPath = resolvedCabinetPath;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function resolveConversationCabinetPath(
  id: string,
  cabinetPath?: string
): Promise<string | null> {
  if (typeof cabinetPath === "string") {
    return (await fileExists(metaPath(id, cabinetPath))) ? cabinetPath : null;
  }

  for (const candidate of await discoverCabinetPaths()) {
    if (await fileExists(metaPath(id, candidate))) {
      return candidate;
    }
  }

  return null;
}

function stripAnsiText(str: string): string {
  return str
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "")
    .replace(/\u001B[P^_][\s\S]*?\u001B\\/g, "")
    // Replace cursor-movement CSI sequences with a space to preserve word boundaries
    .replace(/\u001B\[\d*[CGHID]/g, " ")
    // Strip remaining CSI sequences (colors, formatting, erasing)
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001B[@-_]/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001A\u001C-\u001F\u007F]/g, "")
    // Collapse runs of spaces produced by cursor replacements
    .replace(/ {2,}/g, " ");
}

function normalizeDisplayLine(line: string): string {
  return line
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPromptEchoLineSet(prompt?: string): Set<string> {
  if (!prompt) return new Set<string>();

  return new Set(
    stripAnsiText(prompt)
      .replace(/\r+/g, "\n")
      .split("\n")
      .map((line) => normalizeDisplayLine(line))
      .filter((line) => line.length >= 4)
  );
}

function stripPromptEchoFromTranscript(transcript: string, prompt?: string): string {
  const promptEchoLines = buildPromptEchoLineSet(prompt);
  if (promptEchoLines.size === 0) return transcript;

  return transcript
    .split("\n")
    .filter((line) => {
      const normalized = normalizeDisplayLine(line);
      return !normalized || !promptEchoLines.has(normalized);
    })
    .join("\n");
}

function isPromptEchoLine(line: string, promptEchoLines: Set<string>): boolean {
  const normalized = normalizeDisplayLine(line);
  if (!normalized) return false;
  if (promptEchoLines.has(normalized)) return true;

  let fragmentMatches = 0;
  for (const fragment of promptEchoLines) {
    if (fragment.length < 12) continue;
    if (normalized.includes(fragment)) {
      fragmentMatches += 1;
      if (fragmentMatches >= 2) return true;
    }
  }

  return false;
}

function cleanConversationOutputForParsing(output: string, prompt?: string): string {
  return stripPromptEchoFromTranscript(
    stripAnsiText(output)
      .replace(/\u00A0/g, " ")
      .replace(/\r+/g, "\n")
      .replace(/\s*(SUMMARY:|CONTEXT:|ARTIFACT:)\s*/g, "\n$1"),
    prompt
  );
}

export function formatConversationTranscriptForDisplay(
  transcript: string,
  prompt?: string
): string {
  const cleaned = cleanConversationOutputForParsing(transcript, prompt);
  const promptEchoLines = buildPromptEchoLineSet(prompt);
  const normalized = cleaned
    .replace(/[─-]{8,}/g, "\n")
    .replace(/\s*(SUMMARY:|CONTEXT:|ARTIFACT:)\s*/g, "\n$1")
    .replace(/❯\s*(?=(?:SUMMARY|CONTEXT|ARTIFACT):)/g, "\n");

  function isTerminalNoise(trimmed: string): boolean {
    const normalizedLine = normalizeDisplayLine(trimmed);
    return (
      !trimmed ||
      isPromptEchoLine(trimmed, promptEchoLines) ||
      normalizedLine === PLACEHOLDER_SUMMARY ||
      normalizedLine === PLACEHOLDER_CONTEXT ||
      normalizedLine === PLACEHOLDER_ARTIFACT_HINT ||
      /^[─-]{8,}$/.test(trimmed) ||
      /^[❯>]\s*$/.test(trimmed) ||
      /^⏵⏵/.test(trimmed) ||
      /^◐\s+\w+\s+·\s+\/effort/.test(trimmed) ||
      /\/effort\b/.test(trimmed) ||
      /^\d+\s+MCP server failed\b/.test(trimmed) ||
      /^[✢✳✶✻✽·]\s*$/.test(trimmed) ||
      /^[0-9]+(?:;[0-9]+){2,}m/.test(trimmed) ||
      /(?:^|[\s·])(?:Orbiting|Sublimating)…?(?:\s+\(thinking\))?$/.test(trimmed) ||
      /(?:Sketching|Brewing|Thinking|Manifesting|Twisting|Lollygagging|Contemplating|Vibing|Sautéed)/i.test(trimmed) ||
      /\(thinking\)/.test(trimmed) ||
      trimmed.includes("ClaudeCodev") ||
      trimmed.includes("Sonnet4.6") ||
      trimmed.includes("~/Development/cabinet") ||
      trimmed.includes("bypasspermissionson") ||
      trimmed.includes("[Pastedtext#")
    );
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));

  const filtered: string[] = [];
  let blankCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (isTerminalNoise(trimmed)) {
      if (!trimmed) {
        blankCount += 1;
        if (blankCount <= 1) {
          filtered.push("");
        }
      }
      continue;
    }

    blankCount = 0;
    filtered.push(line);
  }

  const summaryIndex = filtered.findLastIndex((line) => line.trim().startsWith("SUMMARY:"));
  if (summaryIndex !== -1) {
    let start = filtered
      .slice(0, summaryIndex + 1)
      .findLastIndex((line) => line.trim().startsWith("⏺"));

    if (start === -1) {
      start = summaryIndex;
      for (let index = summaryIndex - 1; index >= 0; index -= 1) {
        const trimmed = filtered[index].trim();
        if (!trimmed) {
          if (start < summaryIndex) break;
          continue;
        }
        start = index;
      }
    }

    let end = filtered.length;
    for (let index = summaryIndex + 1; index < filtered.length; index += 1) {
      const trimmed = filtered[index].trim();
      if (!trimmed) continue;
      if (/^(?:CONTEXT|ARTIFACT):/.test(trimmed)) continue;
      if (isTerminalNoise(trimmed)) {
        end = index;
        break;
      }
    }

    return filtered.slice(start, end).join("\n").trim();
  }

  return filtered.join("\n").trim();
}

function transcriptShowsCompletedRun(transcript: string, prompt?: string): boolean {
  // Keep this prompt-aware. A looser regex here will treat the echoed prompt's
  // cabinet instructions as a finished run and force the UI out of streaming mode.
  const parsed = parseCabinetBlock(transcript, prompt);
  if (parsed.summary || parsed.artifactPaths.length > 0) {
    return true;
  }

  const plain = cleanConversationOutputForParsing(transcript, prompt);
  return (
    /(?:^|\n)[❯>]\s*$/.test(plain)
  );
}

async function maybeResolveCompletedConversation(
  meta: ConversationMeta | null
): Promise<ConversationMeta | null> {
  if (!meta) return meta;

  const cabinetPath = meta.cabinetPath;
  const transcript = await readConversationTranscript(meta.id, cabinetPath);
  const prompt = (await fileExists(promptPathFs(meta.id, cabinetPath)))
    ? await readFileContent(promptPathFs(meta.id, cabinetPath))
    : "";
  if (meta.status === "running" && !transcriptShowsCompletedRun(transcript, prompt)) {
    return meta;
  }
  const parsed = parseCabinetBlock(transcript, prompt);
  const needsRepair =
    meta.status === "running" ||
    isPlaceholderCabinetValue(meta.summary) ||
    isPlaceholderCabinetValue(meta.contextSummary) ||
    meta.artifactPaths.some((artifactPath) => isPlaceholderCabinetValue(artifactPath)) ||
    (!!parsed.summary && parsed.summary !== meta.summary) ||
    (!!parsed.contextSummary && parsed.contextSummary !== meta.contextSummary) ||
    (parsed.artifactPaths.length > 0 &&
      parsed.artifactPaths.join("|") !== meta.artifactPaths.join("|"));

  if (!needsRepair) {
    return meta;
  }

  return (
    await finalizeConversation(meta.id, {
      status: meta.status === "running" ? "completed" : meta.status,
      exitCode: meta.status === "running" ? 0 : meta.exitCode,
      output: transcript,
    }, cabinetPath)
  ) || meta;
}

export async function writeConversationMeta(meta: ConversationMeta): Promise<void> {
  await ensureDirectory(conversationDir(meta.id, meta.cabinetPath));
  await writeFileContent(metaPath(meta.id, meta.cabinetPath), JSON.stringify(meta, null, 2));
}

export async function appendConversationTranscript(
  id: string,
  chunk: string,
  cabinetPath?: string
): Promise<void> {
  await ensureDirectory(conversationDir(id, cabinetPath));
  await fs.appendFile(transcriptPathFs(id, cabinetPath), chunk, "utf-8");
}

export async function replaceConversationArtifacts(
  id: string,
  artifacts: ConversationArtifact[],
  cabinetPath?: string
): Promise<void> {
  await ensureDirectory(conversationDir(id, cabinetPath));
  await writeFileContent(artifactsPathFs(id, cabinetPath), JSON.stringify(artifacts, null, 2));
}

export async function finalizeConversation(
  id: string,
  input: {
    status: ConversationStatus;
    exitCode?: number | null;
    output?: string;
  },
  cabinetPath?: string
): Promise<ConversationMeta | null> {
  const meta = await readConversationMeta(id, cabinetPath);
  if (!meta) return null;
  const cp = meta.cabinetPath || cabinetPath;

  const hasPrompt = await fileExists(promptPathFs(id, cp));
  const [output, prompt] = await Promise.all([
    input.output ? Promise.resolve(input.output) : readConversationTranscript(id, cp),
    hasPrompt ? readFileContent(promptPathFs(id, cp)) : Promise.resolve(""),
  ]);
  const cleanedOutput = cleanConversationOutputForParsing(output, prompt);
  const parsed = parseCabinetBlock(cleanedOutput, prompt);
  const artifacts = parsed.artifactPaths.map((artifactPath) => ({
    path: artifactPath,
  }));

  const previousStatus = meta.status;
  meta.status = input.status;
  meta.completedAt =
    meta.completedAt && previousStatus === input.status
      ? meta.completedAt
      : new Date().toISOString();
  meta.exitCode = input.exitCode ?? null;
  meta.summary = parsed.summary || makeSummaryFromOutput(cleanedOutput);
  meta.contextSummary = parsed.contextSummary;
  meta.artifactPaths = artifacts.map((artifact) => artifact.path);

  await Promise.all([
    writeConversationMeta(meta),
    replaceConversationArtifacts(id, artifacts, cp),
  ]);

  // Push notification for terminal statuses
  if (meta.status === "completed" || meta.status === "failed") {
    notificationQueue.push({
      id: meta.id,
      agentSlug: meta.agentSlug,
      cabinetPath: meta.cabinetPath,
      title: meta.title,
      status: meta.status,
      summary: meta.summary,
      completedAt: meta.completedAt || new Date().toISOString(),
    });
  }

  return meta;
}

export async function readConversationTranscript(id: string, cabinetPath?: string): Promise<string> {
  const resolvedCabinetPath = await resolveConversationCabinetPath(id, cabinetPath);
  if (resolvedCabinetPath === null) return "";

  const filePath = transcriptPathFs(id, resolvedCabinetPath);
  if (!(await fileExists(filePath))) return "";
  return readFileContent(filePath);
}

export async function readConversationDetail(
  id: string,
  cabinetPath?: string
): Promise<ConversationDetail | null> {
  const meta = await maybeResolveCompletedConversation(await readConversationMeta(id, cabinetPath));
  if (!meta) return null;
  const cp = meta.cabinetPath || cabinetPath;

  const [hasPrompt, hasMentions, hasArtifacts] = await Promise.all([
    fileExists(promptPathFs(id, cp)),
    fileExists(mentionsPathFs(id, cp)),
    fileExists(artifactsPathFs(id, cp)),
  ]);

  const [prompt, transcript, mentionsRaw, artifactsRaw] = await Promise.all([
    hasPrompt ? readFileContent(promptPathFs(id, cp)) : Promise.resolve(""),
    readConversationTranscript(id, cp),
    hasMentions ? readFileContent(mentionsPathFs(id, cp)) : Promise.resolve("[]"),
    hasArtifacts ? readFileContent(artifactsPathFs(id, cp)) : Promise.resolve("[]"),
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
    request: extractConversationRequest(prompt),
    transcript: formatConversationTranscriptForDisplay(transcript, prompt),
    mentions,
    artifacts,
  };
}

export async function listConversationMetas(
  filters: ListConversationFilters = {}
): Promise<ConversationMeta[]> {
  const cabinetPaths = filters.cabinetPath
    ? [filters.cabinetPath]
    : await discoverCabinetPaths();

  const groups = await Promise.all(
    cabinetPaths.map(async (cabinetPath) => {
      const convsDir = resolveConversationsDir(cabinetPath);
      await ensureDirectory(convsDir);
      const entries = await listDirectory(convsDir);

      return (
        await Promise.all(
          entries
            .filter((entry) => entry.isDirectory)
            .map(async (entry) =>
              maybeResolveCompletedConversation(
                await readConversationMeta(entry.name, cabinetPath)
              )
            )
        )
      ).filter(Boolean) as ConversationMeta[];
    })
  );

  const metas = groups.flat();

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

export async function deleteConversation(id: string, cabinetPath?: string): Promise<boolean> {
  const meta = await readConversationMeta(id, cabinetPath);
  if (!meta) return false;

  const dir = conversationDir(id, meta.cabinetPath || cabinetPath);
  await deleteFileOrDir(dir);
  return true;
}
