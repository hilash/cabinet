import type {
  ConversationMcpEvidenceArtifact,
  ConversationMcpSourceRow,
  ConversationMcpToolArtifact,
  ConversationMeta,
} from "@/types/conversations";
import {
  readOptaleMcpAuditEvents,
  type OptaleMcpAuditEvent,
} from "@/lib/optale/mcp-audit-log";
import { resolveOptaleToolName } from "@/lib/optale/tool-registry";
import { productMcpServerId } from "@/lib/optale/context-registry";

const TOOL_MARKER_PREFIX = "[tool]";
const MAX_PREVIEW_LENGTH = 420;
const MAX_SNIPPET_LENGTH = 300;

function isoDateKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function serverIdFromToolName(toolName: string): string {
  return resolveOptaleToolName(toolName).internalServerId;
}

function truncatePreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PREVIEW_LENGTH - 1).trimEnd()}...`;
}

function truncateSnippet(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SNIPPET_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_SNIPPET_LENGTH - 1).trimEnd()}...`;
}

function extractToolBlocks(transcript: string, toolName: string): string[] {
  const lines = transcript.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.trim() !== `${TOOL_MARKER_PREFIX} ${toolName}`) continue;

    const block: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor] || "";
      if (nextLine.trim().startsWith(`${TOOL_MARKER_PREFIX} `)) break;
      block.push(nextLine);
    }
    blocks.push(block.join("\n").trim());
  }

  return blocks;
}

function stripCabinetBlock(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  let inCabinetBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```cabinet\b/i.test(trimmed)) {
      inCabinetBlock = true;
      continue;
    }
    if (inCabinetBlock) {
      if (trimmed === "```") inCabinetBlock = false;
      continue;
    }
    if (trimmed === "```") continue;
    kept.push(line);
  }

  return kept.join("\n").trim();
}

function previewFromToolBlock(
  block: string,
  fallback?: string,
): string | undefined {
  const stripped = stripCabinetBlock(block);
  const paragraphs = stripped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const preview = paragraphs[0] || stripped.trim() || fallback?.trim();
  return preview ? truncatePreview(preview) : undefined;
}

function normalizePathCandidate(value: string): string | null {
  const trimmed = value.trim().replace(/[),.;:]+$/g, "");
  if (!trimmed.includes("/") || trimmed.includes("://")) return null;
  if (/\s/.test(trimmed)) return null;
  if (!/\.[A-Za-z0-9]{1,8}$/.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, "");
}

export function extractMcpSourcePaths(text: string): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  function add(candidate: string): void {
    const path = normalizePathCandidate(candidate);
    if (!path || seen.has(path)) return;
    seen.add(path);
    paths.push(path);
  }

  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    add(match[1] || "");
  }

  for (const match of text.matchAll(
    /(?:^|[\s([{])([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\.[A-Za-z0-9]{1,8})(?=$|[\s)\]},.;:])/g,
  )) {
    add(match[1] || "");
  }

  return paths;
}

function humanizePathSegment(value: string): string {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleFromPath(sourcePath: string): string {
  const parts = sourcePath.split("/").filter(Boolean);
  const file = parts[parts.length - 1] || sourcePath;
  const base = file.replace(/\.[^.]+$/, "").toLowerCase();
  const titleSegment =
    base === "readme" || base === "index"
      ? parts[parts.length - 2] || file
      : file;
  return humanizePathSegment(titleSegment) || sourcePath;
}

function sourceTypeForTool(toolName: string, serverId: string): string {
  const resolved = resolveOptaleToolName(toolName);
  if (resolved.productToolLabel) return resolved.productToolLabel;
  if (resolved.internalToolName === "qmd__query" || serverId === "qmd") {
    return "Docs / Knowledge Search";
  }
  return serverId.toUpperCase();
}

function sentenceForPath(text: string, sourcePath: string): string | undefined {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;

  const pathIndex = normalized.indexOf(sourcePath);
  if (pathIndex === -1) return undefined;

  let start = 0;
  for (const match of normalized.slice(0, pathIndex).matchAll(/[.!?]\s+/g)) {
    start = (match.index || 0) + match[0].length;
  }

  const afterPath = normalized.slice(pathIndex + sourcePath.length);
  const nextBoundary = afterPath.match(/[.!?](?:\s|$)/);
  const end =
    nextBoundary && typeof nextBoundary.index === "number"
      ? pathIndex + sourcePath.length + nextBoundary.index + 1
      : normalized.length;

  return normalized.slice(start, end).trim();
}

function titleFromSnippet(
  snippet: string | undefined,
  sourcePath: string,
): string | null {
  if (!snippet) return null;
  const beforePath = snippet.replace(/`/g, "").split(sourcePath)[0] || "";
  const match =
    beforePath.match(/\bin the ([A-Za-z][A-Za-z0-9&' -]{2,80})\s+at\s*$/i) ||
    beforePath.match(/\bthe ([A-Za-z][A-Za-z0-9&' -]{2,80})\s+at\s*$/i);
  const title = match?.[1]?.trim();
  return title && title.length <= 80 ? title : null;
}

export function deriveMcpSourceRows(input: {
  toolName: string;
  serverId: string;
  sourcePaths: string[];
  text: string;
  fallbackPreview?: string;
  outcome: ConversationMcpSourceRow["outcome"];
  durationMs?: number;
}): ConversationMcpSourceRow[] {
  const sourceType = sourceTypeForTool(input.toolName, input.serverId);
  const toolIdentity = resolveOptaleToolName(input.toolName);
  const sourceRowToolName = toolIdentity.productToolName || input.toolName;
  const rows = input.sourcePaths.map((sourcePath, index) => {
    const sentence =
      sentenceForPath(input.text, sourcePath) ||
      sentenceForPath(input.fallbackPreview || "", sourcePath);
    const snippet = truncateSnippet(sentence || input.fallbackPreview || "");
    const title =
      titleFromSnippet(sentence, sourcePath) || titleFromPath(sourcePath);

    return {
      id: `${sourceRowToolName}:${sourcePath}:${index + 1}`,
      title,
      path: sourcePath,
      sourceType,
      productToolName: toolIdentity.productToolName,
      productToolLabel: toolIdentity.productToolLabel,
      internalToolName: toolIdentity.internalToolName,
      snippet: snippet || undefined,
      outcome: input.outcome,
      durationMs: input.durationMs,
    };
  });

  if (
    rows.length === 0 &&
    toolIdentity.internalToolName === "qmd__query" &&
    input.outcome === "ok" &&
    input.fallbackPreview
  ) {
    return [
      {
        id: `${sourceRowToolName}:knowledge-result:1`,
        title: "Knowledge result",
        sourceType,
        productToolName: toolIdentity.productToolName,
        productToolLabel: toolIdentity.productToolLabel,
        internalToolName: toolIdentity.internalToolName,
        snippet: truncateSnippet(input.fallbackPreview),
        outcome: input.outcome,
        durationMs: input.durationMs,
      },
    ];
  }

  return rows;
}

function uniqueToolNames(names: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  return names.filter((name): name is string => {
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function shiftToolBlock(input: {
  transcript: string;
  names: string[];
  cache: Map<string, string[]>;
}): string {
  for (const name of input.names) {
    let blocks = input.cache.get(name);
    if (!blocks) {
      blocks = extractToolBlocks(input.transcript, name);
      input.cache.set(name, blocks);
    }
    if (blocks.length > 0) return blocks.shift() || "";
  }
  return "";
}

export function buildConversationMcpToolArtifacts(input: {
  meta: ConversationMeta;
  transcript: string;
  auditEvents: OptaleMcpAuditEvent[];
}): ConversationMcpToolArtifact[] {
  const toolBlocksByName = new Map<string, string[]>();

  return input.auditEvents
    .filter((event) => event.method === "tools/call" && event.toolName)
    .map((event, index) => {
      const toolName = event.toolName || "unknown";
      const toolIdentity = resolveOptaleToolName(
        event.productToolName || event.internalToolName || toolName,
      );
      const productToolName =
        event.productToolName || toolIdentity.productToolName;
      const productToolLabel =
        event.productToolLabel || toolIdentity.productToolLabel;
      const internalToolName =
        event.internalToolName || toolIdentity.internalToolName;
      const block = shiftToolBlock({
        transcript: input.transcript,
        names: uniqueToolNames([productToolName, internalToolName, toolName]),
        cache: toolBlocksByName,
      });
      const strippedBlock = stripCabinetBlock(block);
      const preview = previewFromToolBlock(block, event.error);
      const sourcePaths = extractMcpSourcePaths(
        [strippedBlock, preview || ""].join("\n"),
      );
      const serverId = serverIdFromToolName(toolName);
      const sources = deriveMcpSourceRows({
        toolName: productToolName || internalToolName,
        serverId,
        sourcePaths,
        text: strippedBlock,
        fallbackPreview: preview,
        outcome: event.outcome,
        durationMs: event.durationMs,
      });

      return {
        id: [
          event.timestamp || input.meta.id,
          event.clientId || "unknown-client",
          toolName,
          String(index + 1),
        ].join(":"),
        timestamp: event.timestamp,
        method: "tools/call",
        toolName,
        productToolName,
        productToolLabel,
        internalToolName,
        internalServerId: serverId,
        serverId,
        source: serverId,
        outcome: event.outcome,
        durationMs: event.durationMs,
        clientId: event.clientId,
        authType: event.authType,
        cabinetPath: event.cabinetPath,
        agentScope: event.agentScope,
        argumentKeys: event.argumentKeys,
        error: event.error,
        preview,
        sourcePaths,
        sources,
      };
    });
}

export function projectConversationMcpEvidenceArtifacts(
  artifacts: ConversationMcpToolArtifact[],
): ConversationMcpEvidenceArtifact[] {
  return artifacts.map((artifact) => {
    const serverId = productMcpServerId(
      artifact.internalServerId || artifact.serverId || artifact.source,
    );
    return {
      id: artifact.id,
      source: serverId,
      serverId,
      productToolName: artifact.productToolName,
      productToolLabel: artifact.productToolLabel,
      outcome: artifact.outcome,
      sourcePaths: [...artifact.sourcePaths],
      sources: artifact.sources.map((source) => ({
        title: source.title,
        path: source.path,
        sourceType: source.sourceType,
      })),
    };
  });
}

export async function readConversationMcpToolArtifacts(
  meta: ConversationMeta,
  transcript: string,
): Promise<ConversationMcpToolArtifact[]> {
  const dateKeys = new Set(
    [
      isoDateKey(meta.startedAt),
      isoDateKey(meta.completedAt),
      isoDateKey(meta.lastActivityAt),
    ].filter((value): value is string => Boolean(value)),
  );

  const events = (
    await Promise.all(
      [...dateKeys].map((dateKey) =>
        readOptaleMcpAuditEvents({
          date: new Date(`${dateKey}T00:00:00.000Z`),
          requestId: meta.id,
          limit: 200,
        }),
      ),
    )
  ).flat();

  const seen = new Set<string>();
  const uniqueEvents = events.filter((event) => {
    const key = [
      event.timestamp,
      event.requestId,
      event.clientId,
      event.method,
      event.toolName,
      event.outcome,
      event.durationMs,
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return buildConversationMcpToolArtifacts({
    meta,
    transcript,
    auditEvents: uniqueEvents,
  });
}
