import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readFileContent,
  fileExists,
  ensureDirectory,
  listDirectory,
} from "@/lib/storage/fs-operations";
import type { SlackMessage } from "@/types/agents";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const SLACK_DIR = path.join(AGENTS_DIR, ".slack");

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export async function initSlackDir(): Promise<void> {
  await ensureDirectory(SLACK_DIR);
}

// ---------------------------------------------------------------------------
// Post a message
// ---------------------------------------------------------------------------

export async function postMessage(
  msg: Omit<SlackMessage, "id" | "timestamp">
): Promise<SlackMessage> {
  await initSlackDir();

  const full: SlackMessage = {
    ...msg,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const channelFile = path.join(SLACK_DIR, `${full.channel}.jsonl`);
  const line = JSON.stringify(full) + "\n";
  await fs.appendFile(channelFile, line, "utf-8");

  return full;
}

// ---------------------------------------------------------------------------
// Read messages from a single channel
// ---------------------------------------------------------------------------

export async function getMessages(
  channel: string,
  limit: number = 50
): Promise<SlackMessage[]> {
  const channelFile = path.join(SLACK_DIR, `${channel}.jsonl`);
  if (!(await fileExists(channelFile))) return [];

  const raw = await readFileContent(channelFile);
  const lines = raw.trim().split("\n").filter(Boolean);

  const messages: SlackMessage[] = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  // Sort oldest first (chronological order for chat display)
  messages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  // Return the most recent N messages (tail of sorted array)
  return limit > 0 ? messages.slice(-limit) : messages;
}

// ---------------------------------------------------------------------------
// Read recent messages across ALL channels
// ---------------------------------------------------------------------------

export async function getRecentMessages(
  limit: number = 50
): Promise<SlackMessage[]> {
  await initSlackDir();

  const channels = await listChannels();
  const allMessages: SlackMessage[] = [];

  for (const channel of channels) {
    const msgs = await getMessages(channel, 0); // 0 = get all
    allMessages.push(...msgs);
  }

  allMessages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return limit > 0 ? allMessages.slice(-limit) : allMessages;
}

// ---------------------------------------------------------------------------
// List all channels
// ---------------------------------------------------------------------------

export async function listChannels(): Promise<string[]> {
  await initSlackDir();

  const entries = await listDirectory(SLACK_DIR);
  return entries
    .filter((e) => !e.isDirectory && e.name.endsWith(".jsonl"))
    .map((e) => e.name.replace(/\.jsonl$/, ""));
}

// ---------------------------------------------------------------------------
// Post a system message (convenience helper)
// ---------------------------------------------------------------------------

export async function postSystemMessage(
  channel: string,
  content: string
): Promise<SlackMessage> {
  return postMessage({
    channel,
    agent: "system",
    type: "message",
    content,
    mentions: [],
    kbRefs: [],
  });
}
