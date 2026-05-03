"use client";

import { Loader2 } from "lucide-react";
import { OptaleCommandInspectorPanel as InspectorPanel } from "@/components/optale/command-inspector-panel";
import { cn } from "@/lib/utils";
import type {
  OptaleActionRunLedger,
  OptaleActionRunRecord,
  OptaleActionRunStatus,
} from "@/lib/optale/action-run-ledger";

function runStatusTone(status: OptaleActionRunStatus): string {
  if (status === "blocked" || status === "rejected" || status === "failed") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  if (status === "pending_review" || status === "running") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status === "completed" || status === "dispatched") {
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

export function OptaleCommandRunsView({
  loading,
  ledger,
  filteredRuns,
  selectedRun,
  onSelectRun,
}: {
  loading: boolean;
  ledger: OptaleActionRunLedger | null;
  filteredRuns: OptaleActionRunRecord[];
  selectedRun: OptaleActionRunRecord | null;
  onSelectRun: (id: string) => void;
}) {
  return (
    <section className="px-6 py-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-foreground">
            Run Ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            Read-only evidence for command starts, pending proposals, and
            dispatched or rejected agent actions.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ["Runs", ledger?.counts.runs ?? 0],
            ["Pending", ledger?.counts.pendingReview ?? 0],
            ["Blocked", ledger?.counts.blocked ?? 0],
            ["Dispatched", ledger?.counts.dispatched ?? 0],
            ["Rejected", ledger?.counts.rejected ?? 0],
            ["Running", ledger?.counts.running ?? 0],
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

      {loading && !ledger ? (
        <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading run ledger
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          No action runs match the current search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="grid min-w-[760px] grid-cols-[minmax(180px,1.3fr)_120px_120px_minmax(160px,1fr)_120px] border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <div>Action</div>
              <div>Status</div>
              <div>Kind</div>
              <div>Evidence</div>
              <div>Updated</div>
            </div>
            <div className="divide-y divide-border">
              {filteredRuns.slice(0, 25).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => onSelectRun(run.id)}
                  className={cn(
                    "grid w-full min-w-[760px] grid-cols-[minmax(180px,1.3fr)_120px_120px_minmax(160px,1fr)_120px] gap-3 px-3 py-3 text-left text-xs transition-colors",
                    selectedRun?.id === run.id
                      ? "bg-primary/5"
                      : "hover:bg-muted/30",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {run.label}
                    </div>
                    <div className="mt-0.5 truncate text-muted-foreground">
                      {run.agentSlug || "command"} · {run.cabinetPath}
                    </div>
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                        runStatusTone(run.status),
                      )}
                    >
                      {run.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {run.kind === "command" ? "Command" : "Proposal"}
                  </div>
                  <div className="min-w-0 truncate text-muted-foreground">
                    {run.evidence
                      .slice(0, 2)
                      .map((item) => `${item.label}: ${item.value}`)
                      .join(" · ")}
                  </div>
                  <div className="text-muted-foreground">
                    {formatGeneratedAt(run.updatedAt || run.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {selectedRun ? (
            <InspectorPanel
              title={selectedRun.label}
              subtitle={`${selectedRun.agentSlug || "command-center"} · ${selectedRun.cabinetPath}`}
              badge={{
                label: selectedRun.status.replace("_", " "),
                tone: runStatusTone(selectedRun.status),
              }}
              href={selectedRun.href}
              fields={[
                { label: "Run ID", value: selectedRun.id },
                { label: "Action", value: String(selectedRun.action) },
                { label: "Action ID", value: selectedRun.actionId },
                { label: "Kind", value: selectedRun.kind },
                { label: "Source", value: selectedRun.source },
                { label: "Conversation", value: selectedRun.conversationId },
                { label: "Created", value: selectedRun.createdAt },
                { label: "Updated", value: selectedRun.updatedAt },
                { label: "Warnings", value: selectedRun.warningCount },
                { label: "Hard Blocked", value: selectedRun.hardBlocked },
              ]}
              evidence={selectedRun.evidence}
              spine={selectedRun.operationalSpine}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
