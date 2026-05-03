import type { ConversationMeta } from "@/types/conversations";
import {
  appendEventLog,
  readConversationMeta,
  writeConversationMeta,
} from "./conversation-store";

export interface TagConversationLineageInput {
  spawnedId: string;
  spawnedCabinetPath?: string;
  parent: ConversationMeta;
  readMeta?: typeof readConversationMeta;
  writeMeta?: typeof writeConversationMeta;
  appendEvent?: typeof appendEventLog;
}

/**
 * Best-effort lineage tagging for agent-dispatched runs. The child may live in
 * a different cabinet/root scope than the parent, so callers must pass the
 * child's actual cabinet path instead of assuming parent.cabinetPath.
 */
export async function tagConversationLineage({
  spawnedId,
  spawnedCabinetPath,
  parent,
  readMeta = readConversationMeta,
  writeMeta = writeConversationMeta,
  appendEvent = appendEventLog,
}: TagConversationLineageInput): Promise<void> {
  try {
    const parentCabinetPath = parent.cabinetPath ?? ".";
    const fresh = await readMeta(spawnedId, spawnedCabinetPath ?? parentCabinetPath);
    if (!fresh) return;
    fresh.parentTaskId = parent.id;
    fresh.parentCabinetPath = parentCabinetPath;
    fresh.triggeringAgent = parent.agentSlug;
    fresh.spawnDepth = (parent.spawnDepth ?? 0) + 1;
    await writeMeta(fresh);
    await appendEvent(
      fresh.id,
      {
        type: "agent.action.spawned",
        parentTaskId: parent.id,
        parentCabinetPath,
        triggeringAgent: parent.agentSlug,
        spawnDepth: fresh.spawnDepth,
      },
      fresh.cabinetPath ?? spawnedCabinetPath ?? parent.cabinetPath
    );
  } catch {
    // Lineage is observational; never fail a dispatch or scheduled run over it.
  }
}
