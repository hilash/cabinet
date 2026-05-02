import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import {
  mapAgentDefinitionToPersona,
  projectAgentManifestPersonas,
  renderProjectedPersonaMarkdown,
} from "./persona-projection";
import {
  OPTALE_META_AGENT_IDS,
  OPTALE_META_AGENT_MANIFEST,
} from "./optale-meta-manifest";

function agentById(id: string) {
  const agent = OPTALE_META_AGENT_MANIFEST.agents.find((entry) => entry.id === id);
  assert.ok(agent, `missing agent ${id}`);
  return agent;
}

test("maps AgentDefinition into a paused native Observatory persona", () => {
  const lead = agentById(OPTALE_META_AGENT_IDS.lead);
  const projected = mapAgentDefinitionToPersona(
    OPTALE_META_AGENT_MANIFEST,
    lead,
    { projectedAt: "2026-05-02T00:00:00.000Z" }
  );

  assert.equal(projected.slug, "optale-meta");
  assert.equal(projected.frontmatter.name, "Optale Meta");
  assert.equal(projected.frontmatter.provider, "openrouter");
  assert.equal(projected.frontmatter.adapterType, "openrouter_api");
  assert.deepEqual(projected.frontmatter.adapterConfig, {
    model: "anthropic/claude-sonnet-4",
    temperature: 0.2,
  });
  assert.equal(projected.frontmatter.active, false);
  assert.equal(projected.frontmatter.type, "lead");
  assert.equal(projected.frontmatter.canDispatch, true);
  assert.equal(projected.frontmatter.optaleScope, "system");
  assert.equal(
    projected.frontmatter.optaleMemoryNamespace,
    "optale.command.meta.lead"
  );
  assert.equal(
    projected.frontmatter.optaleHarness.definitionId,
    OPTALE_META_AGENT_IDS.lead
  );
  assert.equal(projected.frontmatter.optaleHarness.projectedAt, "2026-05-02T00:00:00.000Z");
  assert.match(projected.body, /## MCP Policy/);
  assert.match(projected.body, /## Handoffs/);
  assert.match(projected.body, /Legacy LibreChat bridge agent: agent_optale_meta_boss_api/);
});

test("maps provider model defaults into adapter config", () => {
  const codex = agentById(OPTALE_META_AGENT_IDS.codex);
  const claude = agentById(OPTALE_META_AGENT_IDS.claudeOps);

  const projectedCodex = mapAgentDefinitionToPersona(
    OPTALE_META_AGENT_MANIFEST,
    codex
  );
  const projectedClaude = mapAgentDefinitionToPersona(
    OPTALE_META_AGENT_MANIFEST,
    claude
  );

  assert.deepEqual(projectedCodex.frontmatter.adapterConfig, {
    model: "gpt-5.5",
    effort: "medium",
    reasoningEffort: "medium",
    temperature: 0.2,
  });
  assert.equal(projectedCodex.frontmatter.adapterType, "codex_local");
  assert.deepEqual(projectedClaude.frontmatter.adapterConfig, {
    model: "opus",
    temperature: 0.2,
  });
  assert.equal(projectedClaude.frontmatter.adapterType, "claude_local");
});

test("renderProjectedPersonaMarkdown preserves projection metadata in frontmatter", () => {
  const qa = agentById(OPTALE_META_AGENT_IDS.qa);
  const projected = mapAgentDefinitionToPersona(
    OPTALE_META_AGENT_MANIFEST,
    qa,
    { projectedAt: "2026-05-02T01:00:00.000Z" }
  );

  const parsed = matter(renderProjectedPersonaMarkdown(projected));

  assert.equal(parsed.data.name, "Optale QA & Review");
  assert.equal(parsed.data.active, false);
  assert.equal(parsed.data.optaleHarness.manifestId, "optale-command.meta-agents");
  assert.equal(parsed.data.optaleHarness.definitionId, OPTALE_META_AGENT_IDS.qa);
  assert.equal(parsed.data.optaleHarness.legacyLibreChatBridge.agentId, "agent_optale_meta_qa");
  assert.match(parsed.content, /## Approval Policy/);
});

test("projection plan skips existing personas unless overwrite is enabled", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "optale-harness-personas-"));
  try {
    const targetAgentsDir = path.join(tempRoot, ".agents");
    const existingPersonaPath = path.join(targetAgentsDir, "optale-meta", "persona.md");
    await fs.mkdir(path.dirname(existingPersonaPath), { recursive: true });
    await fs.writeFile(existingPersonaPath, "existing persona", "utf8");

    const dryRun = await projectAgentManifestPersonas(OPTALE_META_AGENT_MANIFEST, {
      targetAgentsDir,
      agentIds: [OPTALE_META_AGENT_IDS.lead, OPTALE_META_AGENT_IDS.research],
      projectedAt: "2026-05-02T02:00:00.000Z",
    });

    assert.equal(dryRun.dryRun, true);
    assert.equal(dryRun.entries.find((entry) => entry.slug === "optale-meta")?.action, "skip");
    assert.equal(
      dryRun.entries.find((entry) => entry.slug === "optale-research-context")?.action,
      "create"
    );
    assert.equal(await fs.readFile(existingPersonaPath, "utf8"), "existing persona");

    const written = await projectAgentManifestPersonas(OPTALE_META_AGENT_MANIFEST, {
      dryRun: false,
      targetAgentsDir,
      agentIds: [OPTALE_META_AGENT_IDS.lead, OPTALE_META_AGENT_IDS.research],
      projectedAt: "2026-05-02T02:00:00.000Z",
    });

    assert.equal(written.writtenCount, 1);
    assert.equal(written.skippedCount, 1);
    assert.equal(await fs.readFile(existingPersonaPath, "utf8"), "existing persona");
    assert.match(
      await fs.readFile(
        path.join(targetAgentsDir, "optale-research-context", "persona.md"),
        "utf8"
      ),
      /Optale Research & Context/
    );

    const overwritten = await projectAgentManifestPersonas(OPTALE_META_AGENT_MANIFEST, {
      dryRun: false,
      overwrite: true,
      targetAgentsDir,
      agentIds: [OPTALE_META_AGENT_IDS.lead],
      projectedAt: "2026-05-02T03:00:00.000Z",
    });

    assert.equal(overwritten.writtenCount, 1);
    assert.match(await fs.readFile(existingPersonaPath, "utf8"), /Optale Meta/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
