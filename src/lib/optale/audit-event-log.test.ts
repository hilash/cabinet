import test from "node:test";
import assert from "node:assert/strict";
import { buildOptaleAuditEventLogFromCommandCenter } from "./audit-event-log";

test("buildOptaleAuditEventLog projects runs, decisions, and lineage into audit events", () => {
  const log = buildOptaleAuditEventLogFromCommandCenter({
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
              status: "dispatched",
              conversationId: "child-run-1",
              dispatchedAt: "2026-05-03T00:03:00.000Z",
            },
            {
              id: "action-4",
              action: {
                type: "SCHEDULE_JOB",
                agent: "research",
                name: "Weekly",
                schedule: "0 9 * * 1",
                prompt: "Prepare weekly notes.",
              },
              status: "dispatched",
              jobId: "job-1",
              dispatchedAt: "2026-05-03T00:04:00.000Z",
            },
          ],
        },
      ],
    } as never,
  });

  assert.equal(log.counts.events, 32);
  assert.equal(log.counts.bySource.action_run_ledger, 5);
  assert.equal(log.counts.bySource.policy_decision_log, 5);
  assert.equal(log.counts.bySource.lineage_edge_table, 22);
  assert.equal(log.counts.info, 27);
  assert.equal(log.counts.warning, 3);
  assert.equal(log.counts.error, 2);
  assert.equal(log.operationalSpine.bindingCount, 32);
  assert.equal(log.operationalSpine.capabilities.audit_event.active, 32);

  assert.ok(
    log.events.some(
      (event) =>
        event.id === "audit:run:pending:.:run-1:action-2" &&
        event.source === "action_run_ledger" &&
        event.subjectType === "action_run" &&
        event.severity === "error" &&
        event.operationalSpine.subjectType === "audit_event",
    ),
  );
  assert.ok(
    log.events.some(
      (event) =>
        event.id === "audit:policy:policy:pending:.:run-1:action-2" &&
        event.source === "policy_decision_log" &&
        event.subjectType === "policy_decision" &&
        event.severity === "error",
    ),
  );
  assert.ok(
    log.events.some(
      (event) =>
        event.source === "lineage_edge_table" &&
        event.subjectType === "lineage_edge" &&
        event.summary.includes("job-1"),
    ),
  );
});
