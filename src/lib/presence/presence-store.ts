/**
 * Server-side in-memory presence store.
 *
 * Lives as a module-level singleton for the lifetime of the Next.js process.
 * When any client POSTs a presence update, broadcast() pushes the event
 * instantly to all registered SSE controllers — no polling.
 */

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#F97316",
];

function hashColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return COLORS[h % COLORS.length];
}

export type PresenceData = {
  userId: string;
  name: string;
  image: string | null;
  teamSlug: string;
  currentPath: string | null;
  selectionFrom?: number;
  selectionTo?: number;
  scrollY?: number;
  color: string;
  lastSeen: number;
};

export type PresenceEvent =
  | { type: "snapshot"; users: PresenceData[] }
  | { type: "update"; user: PresenceData }
  | { type: "leave"; userId: string }
  | { type: "content_update"; path: string; content: string; authorId: string };

type SSEController = ReadableStreamDefaultController<Uint8Array>;

// Module-level singletons
const presenceMap = new Map<string, PresenceData>();
const sseClients = new Map<string, SSEController>();
const encoder = new TextEncoder();

export function updatePresence(
  data: Omit<PresenceData, "color"> & { color?: string }
): void {
  const existing = presenceMap.get(data.userId);
  const color = existing?.color ?? data.color ?? hashColor(data.userId);
  const updated: PresenceData = { ...data, color };
  presenceMap.set(data.userId, updated);
  broadcast({ type: "update", user: updated });
}

export function removePresence(userId: string): void {
  if (!presenceMap.has(userId)) return;
  presenceMap.delete(userId);
  broadcast({ type: "leave", userId });
}

export function getTeamPresence(teamSlug: string): PresenceData[] {
  const cutoff = Date.now() - 5 * 60 * 1000;
  return [...presenceMap.values()].filter(
    (u) => u.teamSlug === teamSlug && u.lastSeen >= cutoff
  );
}

export function registerSSEClient(
  userId: string,
  controller: SSEController
): void {
  sseClients.set(userId, controller);
}

export function unregisterSSEClient(userId: string): void {
  sseClients.delete(userId);
}

function broadcast(event: PresenceEvent, skipUserId?: string): void {
  const payload = encoder.encode(
    `event: presence\ndata: ${JSON.stringify(event)}\n\n`
  );
  for (const [userId, controller] of sseClients) {
    if (skipUserId && userId === skipUserId) continue;
    try {
      controller.enqueue(payload);
    } catch {
      // Client already disconnected — will be cleaned up on abort signal
    }
  }
}

/**
 * Broadcast a document content change to all team members except the author.
 * Called after a successful save so recipients always get persisted content.
 */
export function broadcastContentUpdate(
  path: string,
  content: string,
  authorId: string
): void {
  broadcast({ type: "content_update", path, content, authorId }, authorId);
}

// Periodic cleanup every 15s — remove stale entries (> 5 min without heartbeat)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [userId, data] of presenceMap) {
    if (data.lastSeen < cutoff) {
      removePresence(userId);
    }
  }
}, 15_000);
