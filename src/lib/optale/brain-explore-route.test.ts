import test from "node:test";
import assert from "node:assert/strict";
import type { OptaleBrainContext } from "@/lib/optale/brain-context";
import {
  redactExploreContextForClient,
  toolCallViewFromResult,
} from "@/app/api/optale/brain/explore/route";

const context: OptaleBrainContext = {
  subjectType: "personal",
  tenantId: "thor",
  personId: "thor",
  ownerId: "thor",
  cabinetPath: ".",
  dataRoot: "/home/thor/AI-OS",
  vaultNamespace: "vault:root",
  memoryNamespace: "personal:thor",
  graphNamespace: "personal:thor",
  entityNamespace: "personal:thor",
  qmdProfile: "thor",
  graphProfile: "thor",
  entityProfile: "thor",
  mcpPolicyId: "optale-thor",
  mcpClientProfile: "thor",
  secretsRef: "vault://secret/optale-thor",
  allowedScopes: ["personal"],
  source: "inferred",
};

test("Brain explore context redaction hides server paths and secret refs", () => {
  const redacted = redactExploreContextForClient(context);
  const rendered = JSON.stringify(redacted);

  assert.equal(redacted.dataRoot, "[server-side]");
  assert.equal(redacted.secretsRef, "[configured]");
  assert.equal(rendered.includes("/home/thor"), false);
  assert.equal(rendered.includes("vault://secret"), false);
});

test("Brain explore downstream view redacts text and json payloads", () => {
  const view = toolCallViewFromResult("qmd__query", {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          path: "/home/thor/AI-OS/private.md",
          "/var/private-key.md": "path key",
          nested: {
            snippet: "See /tmp/private-source.md",
            "/opt/private-nested-key.md": "nested key",
          },
        }),
      },
    ],
  });
  const rendered = JSON.stringify(view);

  assert.equal(view.name, "sense_search_knowledge");
  assert.equal(rendered.includes("qmd__query"), false);
  assert.equal(rendered.includes("/home/thor"), false);
  assert.equal(rendered.includes("/tmp/"), false);
  assert.equal(rendered.includes("/opt/"), false);
  assert.equal(rendered.includes("/var/"), false);
});
