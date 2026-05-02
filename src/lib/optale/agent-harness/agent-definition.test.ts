import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAgentDefinition,
  validateAgentManifest,
} from "./agent-definition";
import {
  LEGACY_LIBRECHAT_META_AGENT_IDS,
  OPTALE_META_AGENT_IDS,
  OPTALE_META_AGENT_MANIFEST,
} from "./optale-meta-manifest";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("Optale meta manifest validates as the first AgentDefinition slice", () => {
  const result = validateAgentManifest(OPTALE_META_AGENT_MANIFEST);

  assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
  assert.equal(OPTALE_META_AGENT_MANIFEST.schemaVersion, 1);
  assert.equal(OPTALE_META_AGENT_MANIFEST.agents.length, 9);
  assert.deepEqual(
    OPTALE_META_AGENT_MANIFEST.agents.map((agent) => agent.role),
    [
      "Meta lead / boss",
      "Research & Context",
      "Codex / Engineering",
      "Claude Code / Ops",
      "QA & Review",
      "Memory & ORM",
      "Browser & Outreach",
      "Paperclip Fleet",
      "Matrix Comms",
    ]
  );
});

test("lead handoff edges cover every specialist and map to LibreChat bridge tools", () => {
  const lead = OPTALE_META_AGENT_MANIFEST.agents.find(
    (agent) => agent.id === OPTALE_META_AGENT_IDS.lead
  );
  assert.ok(lead);

  assert.deepEqual(
    lead.handoffs.map((handoff) => handoff.to).sort(),
    Object.entries(OPTALE_META_AGENT_IDS)
      .filter(([key]) => key !== "lead")
      .map(([, id]) => id)
      .sort()
  );

  assert.ok(
    lead.handoffs.some(
      (handoff) =>
        handoff.to === OPTALE_META_AGENT_IDS.codex &&
        handoff.legacyToolName ===
          `lc_transfer_to_${LEGACY_LIBRECHAT_META_AGENT_IDS.codex}`
    )
  );
  assert.ok(
    lead.handoffs.some(
      (handoff) =>
        handoff.to === OPTALE_META_AGENT_IDS.claudeOps &&
        handoff.legacyToolName ===
          `lc_transfer_to_${LEGACY_LIBRECHAT_META_AGENT_IDS.claudeOps}`
    )
  );
});

test("manifest records runtime projections without introducing Plane", () => {
  for (const agent of OPTALE_META_AGENT_MANIFEST.agents) {
    assert.equal(agent.scope, "system");
    assert.equal(agent.mcp.defaultDecision, "deny");
    assert.equal(agent.runtimeProjections.nativeOptaleCommand.status, "planned");
    assert.equal(
      agent.runtimeProjections.nativeOptaleCommand.projectionStrategy,
      "generate-from-manifest"
    );
    assert.equal(
      agent.runtimeProjections.legacyLibreChatBridge.status,
      "temporary-bridge"
    );
    assert.equal(agent.runtimeProjections.legacyLibreChatBridge.bridgeOnly, true);

    const serverNames = agent.mcp.servers.flatMap((server) => [
      server.serverId,
      server.legacyServerName || "",
    ]);
    assert.ok(!serverNames.includes("plane"));
  }
});

test("validator reports duplicate ids and unknown handoff targets", () => {
  const broken = clone(OPTALE_META_AGENT_MANIFEST);
  broken.agents[1].id = broken.agents[0].id;
  broken.agents[0].handoffs[0].to = "missing-agent";

  const result = validateAgentManifest(broken);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.message.includes("duplicates")),
    JSON.stringify(result.issues, null, 2)
  );
  assert.ok(
    result.issues.some((issue) =>
      issue.message.includes("references unknown agent id missing-agent")
    ),
    JSON.stringify(result.issues, null, 2)
  );
});

test("validator requires provider model defaults", () => {
  const broken = clone(OPTALE_META_AGENT_MANIFEST.agents[0]);
  delete (broken.provider as { model?: string }).model;

  const result = validateAgentDefinition(broken);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path === "agent.provider.model"),
    JSON.stringify(result.issues, null, 2)
  );
});
