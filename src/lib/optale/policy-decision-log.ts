import type { CabinetVisibilityMode } from "@/types/cabinets";
import {
  buildOptaleActionRunLedger,
  readOptaleActionRunLedger,
  type OptaleActionRunLedger,
  type OptaleActionRunRecord,
} from "@/lib/optale/action-run-ledger";
import type { OptaleCommandCenterAction } from "@/lib/optale/command-center-control";
import {
  buildOptaleOperationalSpineBinding,
  buildOptaleOperationalSpineSummary,
  type OptaleOperationalSpineBinding,
  type OptaleOperationalSpineSummary,
} from "@/lib/optale/operational-spine";
import type { AgentActionType } from "@/types/actions";

export type OptalePolicyDecisionOutcome =
  | "allow"
  | "deny"
  | "needs_review"
  | "not_evaluated";

export type OptalePolicyDecisionReasonCode =
  | "command_run_allowed"
  | "agent_proposal_requires_review"
  | "hard_warning_blocked"
  | "human_approved_action"
  | "human_rejected_action"
  | "action_skipped"
  | "unknown_action_state";

export interface OptalePolicyDecisionEvidence {
  label: string;
  value: string | number | boolean;
}

export interface OptalePolicyDecisionRecord {
  id: string;
  subjectType: "action_run";
  subjectId: string;
  action: OptaleCommandCenterAction | AgentActionType;
  actionId: string;
  outcome: OptalePolicyDecisionOutcome;
  reasonCode: OptalePolicyDecisionReasonCode;
  explanation: string;
  actor: string;
  cabinetPath: string;
  conversationId?: string;
  evaluatedAt: string;
  href?: string;
  evidence: OptalePolicyDecisionEvidence[];
  operationalSpine: OptaleOperationalSpineBinding;
}

export interface OptalePolicyDecisionLog {
  generatedAt: string;
  cabinetPath: string;
  visibilityMode: CabinetVisibilityMode;
  decisions: OptalePolicyDecisionRecord[];
  counts: {
    decisions: number;
    allow: number;
    deny: number;
    needsReview: number;
    notEvaluated: number;
  };
  operationalSpine: OptaleOperationalSpineSummary;
}

function compactEvidence(
  evidence: Array<OptalePolicyDecisionEvidence | false | null | undefined>,
): OptalePolicyDecisionEvidence[] {
  return evidence.filter((item): item is OptalePolicyDecisionEvidence =>
    Boolean(item),
  );
}

function policyDecisionSpine(input: {
  id: string;
  cabinetPath: string;
}): OptaleOperationalSpineBinding {
  return buildOptaleOperationalSpineBinding({
    subjectType: "policy_decision",
    subjectId: input.id,
    cabinetPath: input.cabinetPath,
    capabilityStatus: {
      audit_event: "active",
      lineage_edge: "active",
      policy_decision: "active",
    },
  });
}

function policyDecisionForRun(
  run: OptaleActionRunRecord,
): Pick<
  OptalePolicyDecisionRecord,
  "outcome" | "reasonCode" | "explanation"
> {
  if (run.kind === "command") {
    return {
      outcome: "allow",
      reasonCode: "command_run_allowed",
      explanation:
        "Command Center runs are visible control-plane actions and are recorded as allowed for audit and lineage.",
    };
  }

  if (run.status === "pending_review") {
    return {
      outcome: "needs_review",
      reasonCode: "agent_proposal_requires_review",
      explanation:
        "Agent-proposed actions require human review before they can mutate state.",
    };
  }

  if (run.status === "blocked") {
    return {
      outcome: "deny",
      reasonCode: "hard_warning_blocked",
      explanation:
        "The proposal has a hard warning and cannot dispatch through the current action policy.",
    };
  }

  if (run.status === "dispatched") {
    return {
      outcome: "allow",
      reasonCode: "human_approved_action",
      explanation:
        "The proposal passed review and was dispatched through the governed action path.",
    };
  }

  if (run.status === "rejected") {
    return {
      outcome: "deny",
      reasonCode: "human_rejected_action",
      explanation:
        "The proposal was rejected during human review or by hard-warning enforcement.",
    };
  }

  if (run.status === "skipped") {
    return {
      outcome: "not_evaluated",
      reasonCode: "action_skipped",
      explanation:
        "The proposal was skipped before a full policy decision was required.",
    };
  }

  return {
    outcome: "not_evaluated",
    reasonCode: "unknown_action_state",
    explanation:
      "The action run has no concrete policy outcome yet in the v0 projection.",
  };
}

function decisionCounts(
  decisions: OptalePolicyDecisionRecord[],
): OptalePolicyDecisionLog["counts"] {
  return {
    decisions: decisions.length,
    allow: decisions.filter((decision) => decision.outcome === "allow").length,
    deny: decisions.filter((decision) => decision.outcome === "deny").length,
    needsReview: decisions.filter(
      (decision) => decision.outcome === "needs_review",
    ).length,
    notEvaluated: decisions.filter(
      (decision) => decision.outcome === "not_evaluated",
    ).length,
  };
}

export function buildOptalePolicyDecisionLog(input: {
  ledger: OptaleActionRunLedger;
  limit?: number;
}): OptalePolicyDecisionLog {
  const decisions = input.ledger.runs.map((run) => {
    const policy = policyDecisionForRun(run);
    const id = `policy:${run.id}`;
    return {
      id,
      subjectType: "action_run" as const,
      subjectId: run.id,
      action: run.action,
      actionId: run.actionId,
      actor: run.agentSlug || "command-center",
      cabinetPath: run.cabinetPath,
      conversationId: run.conversationId,
      evaluatedAt: run.updatedAt || run.createdAt,
      href: run.href,
      evidence: compactEvidence([
        { label: "Action Run", value: run.id },
        { label: "Action", value: run.label },
        { label: "Run Status", value: run.status },
        { label: "Warnings", value: run.warningCount },
        run.hardBlocked ? { label: "Hard Blocked", value: true } : null,
      ]),
      operationalSpine: policyDecisionSpine({
        id,
        cabinetPath: run.cabinetPath,
      }),
      ...policy,
    };
  });
  const limited = input.limit ? decisions.slice(0, input.limit) : decisions;
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    cabinetPath: input.ledger.cabinetPath,
    visibilityMode: input.ledger.visibilityMode,
    decisions: limited,
    counts: decisionCounts(limited),
    operationalSpine: buildOptaleOperationalSpineSummary({
      generatedAt,
      cabinetPath: input.ledger.cabinetPath,
      bindings: limited.map((decision) => decision.operationalSpine),
    }),
  };
}

export async function readOptalePolicyDecisionLog(
  input: {
    cabinetPath?: string;
    visibilityMode?: CabinetVisibilityMode;
    limit?: number;
  } = {},
): Promise<OptalePolicyDecisionLog> {
  const ledger = await readOptaleActionRunLedger({
    cabinetPath: input.cabinetPath,
    visibilityMode: input.visibilityMode,
    limit: Math.max(input.limit || 100, 100),
  });

  return buildOptalePolicyDecisionLog({
    ledger,
    limit: input.limit,
  });
}

export function buildOptalePolicyDecisionLogFromCommandCenter(input: {
  commandCenter: Parameters<typeof buildOptaleActionRunLedger>[0]["commandCenter"];
  limit?: number;
}): OptalePolicyDecisionLog {
  return buildOptalePolicyDecisionLog({
    ledger: buildOptaleActionRunLedger({
      commandCenter: input.commandCenter,
      limit: input.limit,
    }),
    limit: input.limit,
  });
}
