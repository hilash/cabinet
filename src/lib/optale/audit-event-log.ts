import type { CabinetVisibilityMode } from "@/types/cabinets";
import {
  buildOptaleActionRunLedger,
  readOptaleActionRunLedger,
  type OptaleActionRunLedger,
  type OptaleActionRunRecord,
} from "@/lib/optale/action-run-ledger";
import {
  buildOptaleLineageEdgeTable,
  type OptaleLineageEdgeRecord,
  type OptaleLineageEdgeTable,
} from "@/lib/optale/lineage-edge-table";
import {
  buildOptaleOperationalSpineBinding,
  buildOptaleOperationalSpineSummary,
  type OptaleOperationalSpineBinding,
  type OptaleOperationalSpineSummary,
} from "@/lib/optale/operational-spine";
import {
  buildOptalePolicyDecisionLog,
  type OptalePolicyDecisionLog,
  type OptalePolicyDecisionRecord,
} from "@/lib/optale/policy-decision-log";

export type OptaleAuditEventSource =
  | "action_run_ledger"
  | "policy_decision_log"
  | "lineage_edge_table";

export type OptaleAuditEventKind =
  | "action_run_recorded"
  | "policy_decision_recorded"
  | "lineage_edge_recorded";

export type OptaleAuditEventSeverity = "info" | "warning" | "error";

export type OptaleAuditEventSubjectType =
  | "action_run"
  | "policy_decision"
  | "lineage_edge";

export interface OptaleAuditEventEvidence {
  label: string;
  value: string | number | boolean;
}

export interface OptaleAuditEventRecord {
  id: string;
  kind: OptaleAuditEventKind;
  source: OptaleAuditEventSource;
  severity: OptaleAuditEventSeverity;
  subjectType: OptaleAuditEventSubjectType;
  subjectId: string;
  action?: string;
  actor: string;
  cabinetPath: string;
  conversationId?: string;
  occurredAt: string;
  href?: string;
  summary: string;
  evidence: OptaleAuditEventEvidence[];
  operationalSpine: OptaleOperationalSpineBinding;
}

export interface OptaleAuditEventLog {
  generatedAt: string;
  cabinetPath: string;
  visibilityMode: CabinetVisibilityMode;
  events: OptaleAuditEventRecord[];
  counts: {
    events: number;
    info: number;
    warning: number;
    error: number;
    bySource: Record<OptaleAuditEventSource, number>;
  };
  operationalSpine: OptaleOperationalSpineSummary;
}

const AUDIT_EVENT_SOURCES: OptaleAuditEventSource[] = [
  "action_run_ledger",
  "policy_decision_log",
  "lineage_edge_table",
];

function compactEvidence(
  evidence: Array<OptaleAuditEventEvidence | false | null | undefined>,
): OptaleAuditEventEvidence[] {
  return evidence.filter((item): item is OptaleAuditEventEvidence =>
    Boolean(item),
  );
}

function readableToken(value: string): string {
  return value.replaceAll("_", " ");
}

function auditEventSpine(input: {
  id: string;
  cabinetPath: string;
}): OptaleOperationalSpineBinding {
  return buildOptaleOperationalSpineBinding({
    subjectType: "audit_event",
    subjectId: input.id,
    cabinetPath: input.cabinetPath,
    capabilityStatus: {
      audit_event: "active",
      lineage_edge: "reserved",
      policy_decision: "reserved",
    },
  });
}

function runSeverity(
  run: OptaleActionRunRecord,
): OptaleAuditEventSeverity {
  if (
    run.status === "blocked" ||
    run.status === "rejected" ||
    run.status === "failed"
  ) {
    return "error";
  }
  if (run.status === "pending_review" || run.status === "running") {
    return "warning";
  }
  return "info";
}

function policySeverity(
  decision: OptalePolicyDecisionRecord,
): OptaleAuditEventSeverity {
  if (decision.outcome === "deny") return "error";
  if (
    decision.outcome === "needs_review" ||
    decision.outcome === "not_evaluated"
  ) {
    return "warning";
  }
  return "info";
}

function runAuditEvent(run: OptaleActionRunRecord): OptaleAuditEventRecord {
  const id = `audit:run:${run.id}`;
  return {
    id,
    kind: "action_run_recorded",
    source: "action_run_ledger",
    severity: runSeverity(run),
    subjectType: "action_run",
    subjectId: run.id,
    action: String(run.action),
    actor: run.agentSlug || "command-center",
    cabinetPath: run.cabinetPath,
    conversationId: run.conversationId,
    occurredAt: run.updatedAt || run.createdAt,
    href: run.href,
    summary: `${run.label} ${readableToken(run.status)}`,
    evidence: compactEvidence([
      { label: "Action Run", value: run.id },
      { label: "Action", value: run.label },
      { label: "Status", value: run.status },
      { label: "Source", value: run.source },
      { label: "Warnings", value: run.warningCount },
      run.hardBlocked ? { label: "Hard Blocked", value: true } : null,
      ...run.evidence.slice(0, 3),
    ]),
    operationalSpine: auditEventSpine({ id, cabinetPath: run.cabinetPath }),
  };
}

function policyAuditEvent(
  decision: OptalePolicyDecisionRecord,
): OptaleAuditEventRecord {
  const id = `audit:policy:${decision.id}`;
  return {
    id,
    kind: "policy_decision_recorded",
    source: "policy_decision_log",
    severity: policySeverity(decision),
    subjectType: "policy_decision",
    subjectId: decision.id,
    action: String(decision.action),
    actor: decision.actor,
    cabinetPath: decision.cabinetPath,
    conversationId: decision.conversationId,
    occurredAt: decision.evaluatedAt,
    href: decision.href,
    summary: `${readableToken(decision.outcome)}: ${readableToken(
      decision.reasonCode,
    )}`,
    evidence: compactEvidence([
      { label: "Policy Decision", value: decision.id },
      { label: "Action Run", value: decision.subjectId },
      { label: "Outcome", value: decision.outcome },
      { label: "Reason", value: decision.reasonCode },
      ...decision.evidence.slice(0, 3),
    ]),
    operationalSpine: auditEventSpine({
      id,
      cabinetPath: decision.cabinetPath,
    }),
  };
}

function lineageAuditEvent(
  edge: OptaleLineageEdgeRecord,
): OptaleAuditEventRecord {
  const id = `audit:lineage:${edge.id}`;
  return {
    id,
    kind: "lineage_edge_recorded",
    source: "lineage_edge_table",
    severity: "info",
    subjectType: "lineage_edge",
    subjectId: edge.id,
    actor: "lineage-projection",
    cabinetPath: edge.cabinetPath,
    occurredAt: edge.createdAt,
    href: edge.target.href || edge.source.href,
    summary: `${edge.source.label} -> ${edge.target.label}`,
    evidence: compactEvidence([
      { label: "Lineage Edge", value: edge.id },
      { label: "Kind", value: edge.kind },
      { label: "Source", value: `${edge.source.kind}:${edge.source.id}` },
      { label: "Target", value: `${edge.target.kind}:${edge.target.id}` },
      edge.runId ? { label: "Action Run", value: edge.runId } : null,
      edge.policyDecisionId
        ? { label: "Policy Decision", value: edge.policyDecisionId }
        : null,
      ...edge.evidence.slice(0, 3),
    ]),
    operationalSpine: auditEventSpine({ id, cabinetPath: edge.cabinetPath }),
  };
}

function sortAuditEvents(
  events: OptaleAuditEventRecord[],
): OptaleAuditEventRecord[] {
  return [...events].sort((left, right) => {
    const leftTime = new Date(left.occurredAt).getTime() || 0;
    const rightTime = new Date(right.occurredAt).getTime() || 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

function auditCounts(
  events: OptaleAuditEventRecord[],
): OptaleAuditEventLog["counts"] {
  const bySource = Object.fromEntries(
    AUDIT_EVENT_SOURCES.map((source) => [source, 0]),
  ) as Record<OptaleAuditEventSource, number>;

  for (const event of events) {
    bySource[event.source] += 1;
  }

  return {
    events: events.length,
    info: events.filter((event) => event.severity === "info").length,
    warning: events.filter((event) => event.severity === "warning").length,
    error: events.filter((event) => event.severity === "error").length,
    bySource,
  };
}

export function buildOptaleAuditEventLog(input: {
  ledger: OptaleActionRunLedger;
  policyLog: OptalePolicyDecisionLog;
  lineageTable: OptaleLineageEdgeTable;
  limit?: number;
}): OptaleAuditEventLog {
  const projected = [
    ...input.ledger.runs.map(runAuditEvent),
    ...input.policyLog.decisions.map(policyAuditEvent),
    ...input.lineageTable.edges.map(lineageAuditEvent),
  ];
  const sorted = sortAuditEvents(projected);
  const limited = input.limit ? sorted.slice(0, input.limit) : sorted;
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    cabinetPath: input.ledger.cabinetPath,
    visibilityMode: input.ledger.visibilityMode,
    events: limited,
    counts: auditCounts(limited),
    operationalSpine: buildOptaleOperationalSpineSummary({
      generatedAt,
      cabinetPath: input.ledger.cabinetPath,
      bindings: limited.map((event) => event.operationalSpine),
    }),
  };
}

export async function readOptaleAuditEventLog(
  input: {
    cabinetPath?: string;
    visibilityMode?: CabinetVisibilityMode;
    limit?: number;
  } = {},
): Promise<OptaleAuditEventLog> {
  const projectionLimit = Math.max(input.limit || 100, 100);
  const ledger = await readOptaleActionRunLedger({
    cabinetPath: input.cabinetPath,
    visibilityMode: input.visibilityMode,
    limit: projectionLimit,
  });
  const policyLog = buildOptalePolicyDecisionLog({
    ledger,
    limit: projectionLimit,
  });
  const lineageTable = buildOptaleLineageEdgeTable({
    ledger,
    policyLog,
    limit: projectionLimit,
  });

  return buildOptaleAuditEventLog({
    ledger,
    policyLog,
    lineageTable,
    limit: input.limit,
  });
}

export function buildOptaleAuditEventLogFromCommandCenter(input: {
  commandCenter: Parameters<
    typeof buildOptaleActionRunLedger
  >[0]["commandCenter"];
  limit?: number;
}): OptaleAuditEventLog {
  const projectionLimit = input.limit ? Math.max(input.limit, 100) : undefined;
  const ledger = buildOptaleActionRunLedger({
    commandCenter: input.commandCenter,
    limit: projectionLimit,
  });
  const policyLog = buildOptalePolicyDecisionLog({
    ledger,
    limit: projectionLimit,
  });
  const lineageTable = buildOptaleLineageEdgeTable({
    ledger,
    policyLog,
    limit: projectionLimit,
  });

  return buildOptaleAuditEventLog({
    ledger,
    policyLog,
    lineageTable,
    limit: input.limit,
  });
}
