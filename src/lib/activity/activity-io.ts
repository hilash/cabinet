import { getDb } from "@/lib/db";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agentSlug?: string;
  eventType: string;
  summary: string;
  details?: string;
  links?: string;
  missionId?: string;
  channelSlug?: string;
}

export function logActivity(event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent {
  const db = getDb();
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  db.prepare(
    `INSERT INTO activity (id, timestamp, agent_slug, event_type, summary, details, links, mission_id, channel_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    timestamp,
    event.agentSlug || null,
    event.eventType,
    event.summary,
    event.details || null,
    event.links || null,
    event.missionId || null,
    event.channelSlug || null
  );

  return {
    id,
    timestamp,
    ...event,
  };
}

export function getActivityFeed(options?: {
  limit?: number;
  offset?: number;
  agentSlug?: string;
  eventType?: string;
}): { events: ActivityEvent[]; total: number } {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.agentSlug) {
    conditions.push("agent_slug = ?");
    params.push(options.agentSlug);
  }
  if (options?.eventType) {
    conditions.push("event_type = ?");
    params.push(options.eventType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM activity ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM activity ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<{
    id: string;
    timestamp: string;
    agent_slug: string | null;
    event_type: string;
    summary: string;
    details: string | null;
    links: string | null;
    mission_id: string | null;
    channel_slug: string | null;
  }>;

  return {
    events: rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      agentSlug: r.agent_slug || undefined,
      eventType: r.event_type,
      summary: r.summary,
      details: r.details || undefined,
      links: r.links || undefined,
      missionId: r.mission_id || undefined,
      channelSlug: r.channel_slug || undefined,
    })),
    total: totalRow.count,
  };
}
