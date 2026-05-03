import test from "node:test";
import assert from "node:assert/strict";
import { tagConversationLineage } from "./run-lineage";
import type { ConversationMeta } from "@/types/conversations";

function meta(overrides: Partial<ConversationMeta> = {}): ConversationMeta {
  return {
    id: "conversation",
    agentSlug: "agent",
    cabinetPath: ".",
    title: "Conversation",
    trigger: "manual",
    status: "completed",
    startedAt: "2026-05-03T00:00:00.000Z",
    promptPath: "",
    transcriptPath: "",
    mentionedPaths: [],
    artifactPaths: [],
    ...overrides,
  };
}

test("tagConversationLineage reads and links a child in its own cabinet scope", async () => {
  const parent = meta({
    id: "parent-convo",
    agentSlug: "ceo",
    cabinetPath: "client-alpha",
    spawnDepth: 1,
  });
  const child = meta({
    id: "child-convo",
    agentSlug: "research",
    cabinetPath: ".",
  });
  const readCalls: Array<{ id: string; cabinetPath?: string }> = [];
  const writes: ConversationMeta[] = [];
  const events: Array<{
    id: string;
    event: Record<string, unknown>;
    cabinetPath?: string;
  }> = [];

  await tagConversationLineage({
    spawnedId: child.id,
    spawnedCabinetPath: child.cabinetPath,
    parent,
    readMeta: async (id, cabinetPath) => {
      readCalls.push({ id, cabinetPath });
      return { ...child };
    },
    writeMeta: async (next) => {
      writes.push({ ...next });
    },
    appendEvent: async (id, event, cabinetPath) => {
      events.push({ id, event, cabinetPath });
      return 1;
    },
  });

  assert.deepEqual(readCalls, [{ id: "child-convo", cabinetPath: "." }]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].parentTaskId, "parent-convo");
  assert.equal(writes[0].parentCabinetPath, "client-alpha");
  assert.equal(writes[0].triggeringAgent, "ceo");
  assert.equal(writes[0].spawnDepth, 2);
  assert.equal(events.length, 1);
  assert.equal(events[0].cabinetPath, ".");
  assert.equal(events[0].event.parentCabinetPath, "client-alpha");
});
