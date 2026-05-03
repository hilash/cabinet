import test from "node:test";
import assert from "node:assert/strict";
import { buildOptalePolicyDecisionLogFromCommandCenter } from "./policy-decision-log";

test("buildOptalePolicyDecisionLog projects action runs into decisions", () => {
  const log = buildOptalePolicyDecisionLogFromCommandCenter({
    commandCenter: {
      cabinet: { path: ".", name: "Root" },
      visibilityMode: "all",
      conversations: [
        {
          id: "run-1",
          agentSlug: "research",
          cabinetPath: ".",
          title: "Research run",
          trigger: "manual",
          status: "running",
          startedAt: "2026-05-03T00:00:00.000Z",
          promptPath: ".agents/.conversations/run-1/prompt.md",
          transcriptPath: ".agents/.conversations/run-1/transcript.md",
          mentionedPaths: [],
          artifactPaths: [],
          pendingActions: [
            {
              id: "action-1",
              createdAt: "2026-05-03T00:01:00.000Z",
              action: {
                type: "LAUNCH_TASK",
                agent: "copywriter",
                title: "Draft",
                prompt: "Draft a summary.",
              },
              warnings: [],
            },
            {
              id: "action-2",
              createdAt: "2026-05-03T00:02:00.000Z",
              action: {
                type: "SCHEDULE_JOB",
                agent: "unknown",
                name: "Followup",
                schedule: "* * * * *",
                prompt: "Follow up.",
              },
              warnings: [
                {
                  code: "unknown_agent",
                  severity: "hard",
                  message: "Missing agent.",
                },
              ],
            },
          ],
          dispatchedActions: [
            {
              id: "action-3",
              action: {
                type: "SCHEDULE_TASK",
                agent: "research",
                when: "tomorrow",
                title: "Check",
                prompt: "Check status.",
              },
              status: "rejected",
              reason: "invalid_when",
              dispatchedAt: "2026-05-03T00:03:00.000Z",
            },
          ],
        },
      ],
    } as never,
  });

  assert.equal(log.counts.decisions, 4);
  assert.equal(log.counts.allow, 1);
  assert.equal(log.counts.needsReview, 1);
  assert.equal(log.counts.deny, 2);
  assert.equal(log.operationalSpine.bindingCount, 4);
  assert.equal(log.operationalSpine.capabilities.policy_decision.active, 4);
  assert.ok(
    log.decisions.some(
      (decision) =>
        decision.subjectId === "pending:.:run-1:action-2" &&
        decision.outcome === "deny" &&
        decision.reasonCode === "hard_warning_blocked" &&
        decision.operationalSpine.subjectType === "policy_decision",
    ),
  );
});
