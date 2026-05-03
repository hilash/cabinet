import type {
  ConversationMcpToolArtifact,
  ConversationMeta,
} from "@/types/conversations";
import {
  readOptaleMcpAuditEvents,
  type OptaleMcpAuditEvent,
} from "@/lib/optale/mcp-audit-log";

const TOOL_MARKER_PREFIX = "[tool]";
const MAX_PREVIEW_LENGTH = 420;

function isoDateKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function serverIdFromToolName(toolName: string): string {
  const [prefix] = toolName.split("__");
  return prefix && prefix !== toolName ? prefix : "optale-agents";
}

function truncatePreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PREVIEW_LENGTH - 1).trimEnd()}...`;
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

function previewFromToolBlock(block: string, fallback?: string): string | undefined {
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
    /(?:^|[\s([{])([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\.[A-Za-z0-9]{1,8})(?=$|[\s)\]},.;:])/g
  )) {
    add(match[1] || "");
  }

  return paths;
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
      let toolBlocks = toolBlocksByName.get(toolName);
      if (!toolBlocks) {
        toolBlocks = extractToolBlocks(input.transcript, toolName);
        toolBlocksByName.set(toolName, toolBlocks);
      }
      const block = toolBlocks.shift() || "";
      const preview = previewFromToolBlock(block, event.error);
      const sourcePaths = extractMcpSourcePaths(
        [stripCabinetBlock(block), preview || ""].join("\n")
      );
      const serverId = serverIdFromToolName(toolName);

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
      };
    });
}

export async function readConversationMcpToolArtifacts(
  meta: ConversationMeta,
  transcript: string
): Promise<ConversationMcpToolArtifact[]> {
  const dateKeys = new Set(
    [
      isoDateKey(meta.startedAt),
      isoDateKey(meta.completedAt),
      isoDateKey(meta.lastActivityAt),
    ].filter((value): value is string => Boolean(value))
  );

  const events = (
    await Promise.all(
      [...dateKeys].map((dateKey) =>
        readOptaleMcpAuditEvents({
          date: new Date(`${dateKey}T00:00:00.000Z`),
          requestId: meta.id,
          limit: 200,
        })
      )
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
