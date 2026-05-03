"use client";

import { Loader2 } from "lucide-react";
import { OptaleCommandInspectorPanel as InspectorPanel } from "@/components/optale/command-inspector-panel";
import { cn } from "@/lib/utils";
import type {
  OptalePolicyDecisionLog,
  OptalePolicyDecisionOutcome,
  OptalePolicyDecisionRecord,
} from "@/lib/optale/policy-decision-log";

function policyOutcomeTone(outcome: OptalePolicyDecisionOutcome): string {
  if (outcome === "deny") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  if (outcome === "needs_review") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (outcome === "allow") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function formatGeneratedAt(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OptaleCommandPolicyView({
  loading,
  policyLog,
  filteredPolicyDecisions,
  selectedPolicyDecision,
  onSelectPolicyDecision,
}: {
  loading: boolean;
  policyLog: OptalePolicyDecisionLog | null;
  filteredPolicyDecisions: OptalePolicyDecisionRecord[];
  selectedPolicyDecision: OptalePolicyDecisionRecord | null;
  onSelectPolicyDecision: (id: string) => void;
}) {
  return (
    <section className="px-6 py-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-foreground">
            Policy Decisions
          </h2>
          <p className="text-xs text-muted-foreground">
            Reason-coded allow, deny, and review outcomes for the current action
            runs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Allow", policyLog?.counts.allow ?? 0],
            ["Review", policyLog?.counts.needsReview ?? 0],
            ["Deny", policyLog?.counts.deny ?? 0],
            ["Unevaluated", policyLog?.counts.notEvaluated ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-border bg-card px-2.5 py-1.5"
            >
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold text-foreground">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && !policyLog ? (
        <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading policy decisions
        </div>
      ) : filteredPolicyDecisions.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          No policy decisions match the current search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="grid min-w-[760px] grid-cols-[120px_minmax(180px,1fr)_180px_minmax(220px,1.2fr)_120px] border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <div>Outcome</div>
              <div>Action</div>
              <div>Reason</div>
              <div>Explanation</div>
              <div>Evaluated</div>
            </div>
            <div className="divide-y divide-border">
              {filteredPolicyDecisions.slice(0, 25).map((decision) => (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => onSelectPolicyDecision(decision.id)}
                  className={cn(
                    "grid w-full min-w-[760px] grid-cols-[120px_minmax(180px,1fr)_180px_minmax(220px,1.2fr)_120px] gap-3 px-3 py-3 text-left text-xs transition-colors",
                    selectedPolicyDecision?.id === decision.id
                      ? "bg-primary/5"
                      : "hover:bg-muted/30",
                  )}
                >
                  <div>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                        policyOutcomeTone(decision.outcome),
                      )}
                    >
                      {decision.outcome.replace("_", " ")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {decision.action}
                    </div>
                    <div className="mt-0.5 truncate text-muted-foreground">
                      {decision.actor} · {decision.cabinetPath}
                    </div>
                  </div>
                  <div className="truncate text-muted-foreground">
                    {decision.reasonCode.replaceAll("_", " ")}
                  </div>
                  <div className="line-clamp-2 text-muted-foreground">
                    {decision.explanation}
                  </div>
                  <div className="text-muted-foreground">
                    {formatGeneratedAt(decision.evaluatedAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {selectedPolicyDecision ? (
            <InspectorPanel
              title={String(selectedPolicyDecision.action)}
              subtitle={`${selectedPolicyDecision.actor} · ${selectedPolicyDecision.cabinetPath}`}
              badge={{
                label: selectedPolicyDecision.outcome.replace("_", " "),
                tone: policyOutcomeTone(selectedPolicyDecision.outcome),
              }}
              href={selectedPolicyDecision.href}
              fields={[
                { label: "Decision ID", value: selectedPolicyDecision.id },
                {
                  label: "Subject Run",
                  value: selectedPolicyDecision.subjectId,
                },
                { label: "Action ID", value: selectedPolicyDecision.actionId },
                { label: "Reason", value: selectedPolicyDecision.reasonCode },
                {
                  label: "Conversation",
                  value: selectedPolicyDecision.conversationId,
                },
                { label: "Evaluated", value: selectedPolicyDecision.evaluatedAt },
                {
                  label: "Explanation",
                  value: selectedPolicyDecision.explanation,
                },
              ]}
              evidence={selectedPolicyDecision.evidence}
              spine={selectedPolicyDecision.operationalSpine}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
