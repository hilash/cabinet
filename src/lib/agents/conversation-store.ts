import fs from "fs/promises";
import path from "path";
import type {
  ConversationArtifact,
  ConversationDetail,
  ConversationMeta,
  ConversationStatus,
  ConversationTrigger,
} from "../../types/conversations";
import {
  DATA_DIR,
  canonicalizeVirtualPagePath,
  sanitizeFilename,
  virtualPathFromFs,
} from "../storage/path-utils";
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

type CabinetFieldName = "SUMMARY" | "CONTEXT" | "ARTIFACT";

const PLACEHOLDER_SUMMARY = "one short summary line";
const PLACEHOLDER_CONTEXT = "optional lightweight memory/context summary";
const PLACEHOLDER_ARTIFACT_HINT = "relative/path/to/file for every KB file you created or updated";

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

function isConversationSummaryNoise(line: string): boolean {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed.startsWith("[tool]") ||
    trimmed.startsWith("[diff]") ||
    trimmed.startsWith("```") ||
    /^(SUMMARY|CONTEXT|ARTIFACT):/i.test(trimmed)
  );
}

function makeSummaryFromOutput(output: string): string | undefined {
  const lines = output.split("\n").map((line) => line.trim());
  let end = lines.length - 1;

  while (end >= 0 && isConversationSummaryNoise(lines[end])) {
    end -= 1;
  }

  if (end >= 0) {
    let start = end;
    while (start > 0 && !isConversationSummaryNoise(lines[start - 1])) {
      start -= 1;
    }

    const candidate = lines
      .slice(start, end + 1)
      .find((line) => !isConversationSummaryNoise(line));
    if (candidate) {
      return candidate.slice(0, 300);
    }
  }

  return lines.find((line) => line && !line.startsWith("```"))?.slice(0, 300);
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
  const trimmed = rawPath.trim().replace(/^\/:\s*/, "").replace(/^:\s*/, "");
  if (!trimmed) return null;
  if (trimmed === PLACEHOLDER_ARTIFACT_HINT) return null;
  if (trimmed.includes("for every KB file")) return null;

  if (trimmed.startsWith("/data/")) {
    return canonicalizeVirtualPagePath(trimmed.replace(/^\/data\//, ""));
  }

  if (trimmed.startsWith(DATA_DIR)) {
    return canonicalizeVirtualPagePath(virtualPathFromFs(trimmed));
  }

  const normalized = trimmed.replace(/^\.?\//, "");
  if (!normalized || normalized.startsWith("..")) return null;
  return canonicalizeVirtualPagePath(normalized);
}

function sanitizeCabinetFieldValue(value: string): string {
  return value
    .replace(/\\r\\n|\\n|\\r/g, " ")
    .replace(/\s*❯\s*$/g, "")
    .replace(/\s*[─-]{8,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlaceholderCabinetValue(value?: string): boolean {
  if (!value) return false;
  const normalized = sanitizeCabinetFieldValue(value).toLowerCase();
  return (
    normalized === PLACEHOLDER_SUMMARY ||
    normalized === PLACEHOLDER_CONTEXT ||
    normalized === PLACEHOLDER_ARTIFACT_HINT
  );
}

function repairWrappedCabinetFields(text: string): string {
  return text
    .replace(/SUM\s*\n\s*MARY:/gi, "\nSUMMARY:")
    .replace(/CON\s*\n\s*TEXT:/gi, "\nCONTEXT:")
    .replace(/ARTI?\s*\n\s*FACT:/gi, "\nARTIFACT:");
}

function normalizeCabinetLetters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function containsSubsequence(source: string, target: string): boolean {
  let index = 0;
  for (const char of source) {
    if (char === target[index]) {
      index += 1;
      if (index === target.length) {
        return true;
      }
    }
  }
  return false;
}

function detectCabinetField(prefix: string, value: string): CabinetFieldName | null {
  const normalizedPrefix = normalizeCabinetLetters(prefix);
  const normalizedCombined = `${normalizedPrefix}${normalizeCabinetLetters(value.slice(0, 24))}`;

  if (
    normalizedPrefix.endsWith("summary") ||
    containsSubsequence(normalizedPrefix, "summary")
  ) {
    return "SUMMARY";
  }

  if (
    normalizedPrefix.endsWith("context") ||
    containsSubsequence(normalizedPrefix, "context") ||
    containsSubsequence(normalizedCombined, "context")
  ) {
    return "CONTEXT";
  }

  if (
    normalizedPrefix.endsWith("artifact") ||
    containsSubsequence(normalizedPrefix, "artifact") ||
    containsSubsequence(normalizedCombined, "artifact")
  ) {
    return "ARTIFACT";
  }

  return null;
}

function stripLeadingFieldFragments(value: string, field: CabinetFieldName): string {
  if (field === "SUMMARY") {
    return value.replace(/^(?:MARY)\s*[: -]?\s*/i, "");
  }

  if (field === "CONTEXT") {
    return value.replace(/^(?:TEXT)\s*[: -]?\s*/i, "");
  }

  return value.replace(/^(?:ACT|FACT|IFACT|TIFACT|RTIFACT)\s*[: -]?\s*/i, "");
}

function parseCabinetFieldEntries(
  blockText: string
): Array<{ field: CabinetFieldName; value: string }> {
  const lines = repairWrappedCabinetFields(blockText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const entries: Array<{ field: CabinetFieldName; value: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].endsWith("CON") && lines[index + 1]?.startsWith("TEXT:")) {
      lines[index] = lines[index].slice(0, -3).trimEnd();
      lines[index + 1] = `CONTEXT:${lines[index + 1].slice("TEXT:".length)}`;
    }

    const line = lines[index];
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const prefix = line.slice(0, colonIndex);
    const field = detectCabinetField(prefix, line.slice(colonIndex + 1));
    if (!field) continue;

    let value = stripLeadingFieldFragments(line.slice(colonIndex + 1).trim(), field);
    if (field === "SUMMARY" && value.endsWith("CON") && lines[index + 1]?.startsWith("TEXT:")) {
      value = value.slice(0, -3).trimEnd();
    }

    value = sanitizeCabinetFieldValue(value);
    if (!value) continue;

    entries.push({ field, value });
  }

  return entries;
}

function parseCabinetEntries(entries: Array<{ field: CabinetFieldName; value: string }>): ParsedCabinetBlock {
  const artifactPaths: string[] = [];
  let summary = "";
  let contextSummary = "";

  for (const entry of entries) {
    if (entry.field === "SUMMARY") {
      summary = entry.value;
      continue;
    }

    if (entry.field === "CONTEXT") {
      contextSummary = entry.value;
      continue;
    }

    const normalized = normalizeArtifactPath(entry.value);
    if (normalized && !artifactPaths.includes(normalized)) {
      artifactPaths.push(normalized);
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

function extractCabinetLikeBlock(cleaned: string): string | null {
  const matches = Array.from(cleaned.matchAll(/(?:^|\n)```([^\n]*)\n([\s\S]*?)\n```/g));
  const match = [...matches].reverse().find((entry) => {
    const label = entry[1].trim().toLowerCase();
    return label.includes("cabinet") || label.includes("cab");
  });

  return match ? match[2] : null;
}

function extractArtifactPathsFromOutput(output: string): string[] {
  const artifactPaths: string[] = [];

  function addArtifact(rawPath: string): void {
    const normalized = normalizeArtifactPath(rawPath);
    if (normalized && !artifactPaths.includes(normalized)) {
      artifactPaths.push(normalized);
    }
  }

  for (const match of output.matchAll(/^\[diff\]\s+(.+)$/gm)) {
    addArtifact(match[1]);
  }

  for (const match of output.matchAll(/^\[tool\]\s+Edit\s+(.+?)\s+\((?:in_progress|completed|failed)\)$/gm)) {
    for (const rawPath of match[1].split(/\s*,\s*/)) {
      addArtifact(rawPath);
    }
  }

  return artifactPaths;
}

function deriveConversationOutput(output: string, prompt?: string): ParsedCabinetBlock {
  const cleaned = cleanConversationOutputForParsing(output, prompt);
  const parsed = parseCabinetBlock(cleaned, prompt);
  const fallbackArtifacts = extractArtifactPathsFromOutput(cleaned);

  return {
    summary: parsed.summary,
    contextSummary: parsed.contextSummary,
    artifactPaths: fallbackArtifacts.length > 0 ? fallbackArtifacts : parsed.artifactPaths,
  };
}

export function parseCabinetBlock(output: string, prompt?: string): ParsedCabinetBlock {
  const cleaned = cleanConversationOutputForParsing(output, prompt);
  const cabinetBlock = extractCabinetLikeBlock(cleaned);

  if (cabinetBlock) {
    return parseCabinetEntries(parseCabinetFieldEntries(cabinetBlock));
  }

  const tail = cleaned.split("\n").slice(-80).join("\n");
  const fieldMatches = Array.from(
    tail.matchAll(/(?:^|\n)\s*(SUMMARY|CONTEXT|ARTIFACT):\s*(.*)$/gm)
  );
  if (fieldMatches.length === 0) {
    return { artifactPaths: [] };
  }

  const artifactPaths: string[] = [];
  let summary = "";
  let contextSummary = "";
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
  return repairWrappedCabinetFields(
    stripPromptEchoFromTranscript(
      stripAnsiText(output)
        .replace(/\u00A0/g, " ")
        .replace(/\r+/g, "\n")
        .replace(/\s*(SUMMARY:|CONTEXT:|ARTIFACT:)\s*/g, "\n$1"),
      prompt
    )
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

  const transcript = await readConversationTranscript(meta.id);
  const prompt = (await fileExists(promptPathFs(meta.id)))
    ? await readFileContent(promptPathFs(meta.id))
    : "";
  if (meta.status === "running" && !transcriptShowsCompletedRun(transcript, prompt)) {
    return meta;
  }
  const parsed = deriveConversationOutput(transcript, prompt);
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
    })
  ) || meta;
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

  const hasPrompt = await fileExists(promptPathFs(id));
  const [output, prompt] = await Promise.all([
    input.output ? Promise.resolve(input.output) : readConversationTranscript(id),
    hasPrompt ? readFileContent(promptPathFs(id)) : Promise.resolve(""),
  ]);
  const cleanedOutput = cleanConversationOutputForParsing(output, prompt);
  const parsed = deriveConversationOutput(cleanedOutput, prompt);
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
  const meta = await maybeResolveCompletedConversation(await readConversationMeta(id));
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

  const normalizedArtifacts = artifacts.map((artifact) => ({
    ...artifact,
    path: canonicalizeVirtualPagePath(artifact.path),
  }));
  const normalizedArtifactPaths = meta.artifactPaths.map((artifactPath) =>
    canonicalizeVirtualPagePath(artifactPath)
  );

  return {
    meta: {
      ...meta,
      artifactPaths: normalizedArtifactPaths,
    },
    prompt,
    request: extractConversationRequest(prompt),
    transcript: formatConversationTranscriptForDisplay(transcript, prompt),
    mentions,
    artifacts: normalizedArtifacts,
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
        .map(async (entry) =>
          maybeResolveCompletedConversation(await readConversationMeta(entry.name))
        )
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
