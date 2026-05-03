import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConversationMcpToolArtifacts,
  deriveMcpSourceRows,
  extractMcpSourcePaths,
} from "./conversation-mcp-artifacts";
import type { ConversationMeta } from "@/types/conversations";

function makeMeta(overrides: Partial<ConversationMeta> = {}): ConversationMeta {
  return {
    id: "2026-05-02T23-47-55-149Z-3a52ce78-optale-research-context-manual",
    agentSlug: "optale-research-context",
    cabinetPath: ".",
    title: "MCP qmd-only smoke: optale-research-context",
    trigger: "manual",
    status: "completed",
    startedAt: "2026-05-02T23:47:55.149Z",
    completedAt: "2026-05-02T23:48:03.020Z",
    providerId: "openrouter",
    adapterType: "openrouter_api",
    promptPath: ".agents/.conversations/run/prompt.md",
    transcriptPath: ".agents/.conversations/run/transcript.txt",
    mentionedPaths: [],
    artifactPaths: [],
    ...overrides,
  };
}

test("buildConversationMcpToolArtifacts extracts qmd source preview from transcript and audit event", () => {
  const transcript = [
    "[tool] qmd__query",
    "Based on the search results, the Optale Agent Harness manifest canonical source for LibreChat bridge is documented in the Optale Bridge Workbench at `business/business/products-services/optale-bridge/workbench/readme.md`, which appears to be the primary reference.",
    "",
    "```cabinet",
    "SUMMARY: Found Optale Agent Harness manifest canonical source in Optale Bridge Workbench documentation",
    "CONTEXT: QMD search located primary LibreChat bridge documentation in business/products-services/optale-bridge/workbench/readme.md",
    "ARTIFACT: none",
    "```",
  ].join("\n");

  const [artifact] = buildConversationMcpToolArtifacts({
    meta: makeMeta(),
    transcript,
    auditEvents: [
      {
        timestamp: "2026-05-02T23:48:00.483Z",
        requestId:
          "2026-05-02T23-47-55-149Z-3a52ce78-optale-research-context-manual",
        clientId: "openrouter-api",
        authType: "internal",
        method: "tools/call",
        toolName: "qmd__query",
        cabinetPath: ".",
        agentScope: "system",
        outcome: "ok",
        durationMs: 3061,
        argumentKeys: ["agentScope", "cabinetPath", "limit", "searches"],
      },
    ],
  });

  assert.ok(artifact);
  assert.equal(artifact.toolName, "qmd__query");
  assert.equal(artifact.productToolName, "sense_search_knowledge");
  assert.equal(artifact.productToolLabel, "Docs / Knowledge Search");
  assert.equal(artifact.internalToolName, "qmd__query");
  assert.equal(artifact.serverId, "qmd");
  assert.equal(artifact.source, "qmd");
  assert.equal(artifact.outcome, "ok");
  assert.equal(artifact.durationMs, 3061);
  assert.equal(artifact.clientId, "openrouter-api");
  assert.equal(artifact.agentScope, "system");
  assert.match(artifact.preview || "", /Optale Bridge Workbench/);
  assert.deepEqual(artifact.sourcePaths, [
    "business/business/products-services/optale-bridge/workbench/readme.md",
  ]);
  assert.deepEqual(artifact.sources, [
    {
      id: "sense_search_knowledge:business/business/products-services/optale-bridge/workbench/readme.md:1",
      title: "Optale Bridge Workbench",
      path: "business/business/products-services/optale-bridge/workbench/readme.md",
      sourceType: "Docs / Knowledge Search",
      productToolName: "sense_search_knowledge",
      productToolLabel: "Docs / Knowledge Search",
      internalToolName: "qmd__query",
      snippet:
        "Based on the search results, the Optale Agent Harness manifest canonical source for LibreChat bridge is documented in the Optale Bridge Workbench at `business/business/products-services/optale-bridge/workbench/readme.md`, which appears to be the primary reference.",
      outcome: "ok",
      durationMs: 3061,
    },
  ]);
});

test("buildConversationMcpToolArtifacts renders failed tool calls with explicit error preview", () => {
  const [artifact] = buildConversationMcpToolArtifacts({
    meta: makeMeta({ id: "failed-run" }),
    transcript: "[tool] qmd__query\n",
    auditEvents: [
      {
        timestamp: "2026-05-02T23:38:41.827Z",
        requestId: "failed-run",
        clientId: "openrouter-api",
        authType: "internal",
        method: "tools/call",
        toolName: "qmd__query",
        outcome: "error",
        durationMs: 4026,
        error: "Downstream MCP call timed out after 4000ms",
      },
    ],
  });

  assert.equal(artifact.outcome, "error");
  assert.equal(artifact.error, "Downstream MCP call timed out after 4000ms");
  assert.equal(artifact.preview, "Downstream MCP call timed out after 4000ms");
  assert.deepEqual(artifact.sourcePaths, []);
  assert.deepEqual(artifact.sources, []);
});

test("extractMcpSourcePaths deduplicates backticked and bare path references", () => {
  assert.deepEqual(
    extractMcpSourcePaths(
      [
        "`business/docs/source.md`",
        "Bare path business/docs/source.md should not duplicate.",
        "Another source is notes/research/context.yaml.",
      ].join("\n"),
    ),
    ["business/docs/source.md", "notes/research/context.yaml"],
  );
});

test("deriveMcpSourceRows falls back to path title when prose title is unavailable", () => {
  assert.deepEqual(
    deriveMcpSourceRows({
      toolName: "qmd__query",
      serverId: "qmd",
      sourcePaths: ["business/ops/runbooks/qmd-search.md"],
      text: "See `business/ops/runbooks/qmd-search.md` for the runbook.",
      outcome: "ok",
      durationMs: 1200,
    }),
    [
      {
        id: "sense_search_knowledge:business/ops/runbooks/qmd-search.md:1",
        title: "Qmd Search",
        path: "business/ops/runbooks/qmd-search.md",
        sourceType: "Docs / Knowledge Search",
        productToolName: "sense_search_knowledge",
        productToolLabel: "Docs / Knowledge Search",
        internalToolName: "qmd__query",
        snippet: "See `business/ops/runbooks/qmd-search.md` for the runbook.",
        outcome: "ok",
        durationMs: 1200,
      },
    ],
  );
});
