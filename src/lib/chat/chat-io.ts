import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { getDb } from "@/lib/db";

const CHAT_DIR = path.join(DATA_DIR, ".chat");
const CHANNELS_FILE = path.join(CHAT_DIR, "channels.json");

export interface Channel {
  slug: string;
  name: string;
  members: string[];
  description?: string;
}

export interface ChatMessage {
  id: string;
  channelSlug: string;
  fromId: string;
  fromType: "agent" | "human" | "system";
  content: string;
  replyTo?: string;
  pinned: boolean;
  createdAt: string;
}

// --- Channel File I/O ---

async function ensureChatDir(): Promise<void> {
  await fs.mkdir(CHAT_DIR, { recursive: true });
}

export async function listChannels(): Promise<Channel[]> {
  await ensureChatDir();
  try {
    const raw = await fs.readFile(CHANNELS_FILE, "utf-8");
    return JSON.parse(raw) as Channel[];
  } catch {
    return [];
  }
}

export async function getChannel(slug: string): Promise<Channel | null> {
  const channels = await listChannels();
  return channels.find((c) => c.slug === slug) || null;
}

export async function createChannel(channel: Channel): Promise<void> {
  await ensureChatDir();
  const channels = await listChannels();

  if (channels.find((c) => c.slug === channel.slug)) {
    throw new Error(`Channel "${channel.slug}" already exists`);
  }

  channels.push(channel);
  await fs.writeFile(CHANNELS_FILE, JSON.stringify(channels, null, 2));
}

export async function updateChannel(
  slug: string,
  updates: Partial<Pick<Channel, "name" | "members" | "description">>
): Promise<Channel | null> {
  const channels = await listChannels();
  const idx = channels.findIndex((c) => c.slug === slug);
  if (idx === -1) return null;

  channels[idx] = { ...channels[idx], ...updates };
  await fs.writeFile(CHANNELS_FILE, JSON.stringify(channels, null, 2));
  return channels[idx];
}

// --- Message SQLite Operations ---

export function getMessages(
  channelSlug: string,
  limit = 100,
  before?: string
): ChatMessage[] {
  const db = getDb();

  let query = "SELECT * FROM messages WHERE channel_slug = ?";
  const params: (string | number)[] = [channelSlug];

  if (before) {
    query += " AND created_at < ?";
    params.push(before);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(query).all(...params) as Array<{
    id: string;
    channel_slug: string;
    from_id: string;
    from_type: string;
    content: string;
    reply_to: string | null;
    pinned: number;
    created_at: string;
  }>;

  return rows
    .map((r) => ({
      id: r.id,
      channelSlug: r.channel_slug,
      fromId: r.from_id,
      fromType: r.from_type as ChatMessage["fromType"],
      content: r.content,
      replyTo: r.reply_to || undefined,
      pinned: r.pinned === 1,
      createdAt: r.created_at,
    }))
    .reverse(); // Return in chronological order
}

export function postMessage(
  channelSlug: string,
  fromId: string,
  fromType: "agent" | "human" | "system",
  content: string,
  replyTo?: string
): ChatMessage {
  const db = getDb();
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO messages (id, channel_slug, from_id, from_type, content, reply_to, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, channelSlug, fromId, fromType, content, replyTo || null, now);

  return {
    id,
    channelSlug,
    fromId,
    fromType,
    content,
    replyTo,
    pinned: false,
    createdAt: now,
  };
}

export function togglePin(messageId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT pinned FROM messages WHERE id = ?").get(messageId) as
    | { pinned: number }
    | undefined;
  if (!row) return false;

  const newPinned = row.pinned === 1 ? 0 : 1;
  db.prepare("UPDATE messages SET pinned = ? WHERE id = ?").run(
    newPinned,
    messageId
  );
  return newPinned === 1;
}

export function getLatestMessageTime(channelSlug: string): string | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT MAX(created_at) as latest FROM messages WHERE channel_slug = ?"
    )
    .get(channelSlug) as { latest: string | null } | undefined;
  return row?.latest || null;
}
