import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOptaleOperationalSpineBinding,
  buildOptaleOperationalSpineSummary,
} from "./operational-spine";

test("buildOptaleOperationalSpineBinding reserves core governance refs", () => {
  const binding = buildOptaleOperationalSpineBinding({
    subjectType: "resource",
    subjectId: "space:clients/acme",
    cabinetPath: "clients/acme",
  });

  assert.equal(binding.version, 1);
  assert.equal(binding.subjectType, "resource");
  assert.equal(binding.cabinetPath, "clients/acme");
  assert.equal(binding.refs.audit_event.status, "reserved");
  assert.equal(binding.refs.lineage_edge.status, "reserved");
  assert.equal(binding.refs.policy_decision.status, "reserved");
  assert.equal(binding.refs.eval_run.status, "planned");
  assert.equal(binding.refs.model_usage.status, "planned");
  assert.equal(binding.refs.branch_review.status, "planned");
  assert.ok(binding.futureSurfaces.includes("document_intelligence"));
  assert.ok(binding.futureSurfaces.includes("model_studio"));
  assert.ok(binding.futureSurfaces.includes("pack_distribution"));
  assert.ok(binding.futureSurfaces.includes("ai_builder"));
});

test("buildOptaleOperationalSpineSummary counts capability statuses", () => {
  const bindings = [
    buildOptaleOperationalSpineBinding({
      subjectType: "action_type",
      subjectId: "command:launch_conversation",
    }),
    buildOptaleOperationalSpineBinding({
      subjectType: "action_queue",
      subjectId: "queue:root:run-1",
      capabilityStatus: {
        policy_decision: "active",
      },
    }),
  ];

  const summary = buildOptaleOperationalSpineSummary({
    generatedAt: "2026-05-03T00:00:00.000Z",
    cabinetPath: ".",
    bindings,
  });

  assert.equal(summary.bindingCount, 2);
  assert.equal(summary.capabilities.audit_event.reserved, 2);
  assert.equal(summary.capabilities.policy_decision.reserved, 1);
  assert.equal(summary.capabilities.policy_decision.active, 1);
  assert.deepEqual(summary.futureSurfaces.ai_builder.prerequisiteCapabilities, [
    "audit_event",
    "lineage_edge",
    "policy_decision",
    "eval_run",
    "model_usage",
    "branch_review",
  ]);
});
