// Track which agents are currently responding (for typing indicator)
const respondingAgents = new Map<string, { channel: string; since: number }>();

export function getRespondingAgents(): Map<string, { channel: string; since: number }> {
  // Clean up stale entries (older than 3 minutes)
  const now = Date.now();
  for (const [slug, info] of respondingAgents) {
    if (now - info.since > 180_000) respondingAgents.delete(slug);
  }
  return respondingAgents;
}
