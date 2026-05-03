"use client";

import { Loader2 } from "lucide-react";
import { OptaleCommandInspectorPanel as InspectorPanel } from "@/components/optale/command-inspector-panel";
import { cn } from "@/lib/utils";
import type {
  OptaleLineageEdgeKind,
  OptaleLineageEdgeRecord,
  OptaleLineageEdgeTable,
} from "@/lib/optale/lineage-edge-table";

const LINEAGE_EDGE_KIND_LABELS: Record<OptaleLineageEdgeKind, string> = {
  produces_run: "Produces Run",
  invokes: "Invokes",
  produces_decision: "Decision",
  targets_agent: "Targets Agent",
  created_child_run: "Child Run",
  created_job: "Created Job",
};

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

export function OptaleCommandLineageView({
  loading,
  lineage,
  filteredLineageEdges,
  selectedLineageEdge,
  onSelectLineageEdge,
}: {
  loading: boolean;
  lineage: OptaleLineageEdgeTable | null;
  filteredLineageEdges: OptaleLineageEdgeRecord[];
  selectedLineageEdge: OptaleLineageEdgeRecord | null;
  onSelectLineageEdge: (id: string) => void;
}) {
  return (
    <section className="px-6 py-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-foreground">
            Lineage Edges
          </h2>
          <p className="text-xs text-muted-foreground">
            Read-only graph edges linking conversations, actions, decisions,
            agents, and produced work.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Edges", lineage?.counts.edges ?? 0],
            ["Invokes", lineage?.counts.byKind.invokes ?? 0],
            ["Decisions", lineage?.counts.byKind.produces_decision ?? 0],
            ["Targets", lineage?.counts.byKind.targets_agent ?? 0],
            [
              "Outputs",
              (lineage?.counts.byKind.created_child_run ?? 0) +
                (lineage?.counts.byKind.created_job ?? 0),
            ],
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

      {loading && !lineage ? (
        <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading lineage edges
        </div>
      ) : filteredLineageEdges.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          No lineage edges match the current search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="grid min-w-[840px] grid-cols-[140px_minmax(190px,1fr)_minmax(190px,1fr)_minmax(180px,1fr)_120px] border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              <div>Kind</div>
              <div>Source</div>
              <div>Target</div>
              <div>Evidence</div>
              <div>Created</div>
            </div>
            <div className="divide-y divide-border">
              {filteredLineageEdges.slice(0, 25).map((edge) => (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => onSelectLineageEdge(edge.id)}
                  className={cn(
                    "grid w-full min-w-[840px] grid-cols-[140px_minmax(190px,1fr)_minmax(190px,1fr)_minmax(180px,1fr)_120px] gap-3 px-3 py-3 text-left text-xs transition-colors",
                    selectedLineageEdge?.id === edge.id
                      ? "bg-primary/5"
                      : "hover:bg-muted/30",
                  )}
                >
                  <div>
                    <span className="inline-flex rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      {LINEAGE_EDGE_KIND_LABELS[edge.kind]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {edge.source.label}
                    </div>
                    <div className="mt-0.5 truncate text-muted-foreground">
                      {edge.source.kind.replaceAll("_", " ")} ·{" "}
                      {edge.cabinetPath}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {edge.target.label}
                    </div>
                    <div className="mt-0.5 truncate text-muted-foreground">
                      {edge.target.kind.replaceAll("_", " ")} ·{" "}
                      {edge.target.cabinetPath || edge.cabinetPath}
                    </div>
                  </div>
                  <div className="min-w-0 truncate text-muted-foreground">
                    {edge.evidence
                      .slice(0, 2)
                      .map((item) => `${item.label}: ${item.value}`)
                      .join(" · ")}
                  </div>
                  <div className="text-muted-foreground">
                    {formatGeneratedAt(edge.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {selectedLineageEdge ? (
            <InspectorPanel
              title={`${selectedLineageEdge.source.label} -> ${selectedLineageEdge.target.label}`}
              subtitle={`${selectedLineageEdge.source.kind.replaceAll("_", " ")} to ${selectedLineageEdge.target.kind.replaceAll("_", " ")}`}
              badge={{
                label: LINEAGE_EDGE_KIND_LABELS[selectedLineageEdge.kind],
                tone: "border-primary/25 bg-primary/10 text-primary",
              }}
              href={
                selectedLineageEdge.target.href ||
                selectedLineageEdge.source.href
              }
              fields={[
                { label: "Edge ID", value: selectedLineageEdge.id },
                { label: "Kind", value: selectedLineageEdge.kind },
                { label: "Source ID", value: selectedLineageEdge.source.id },
                { label: "Target ID", value: selectedLineageEdge.target.id },
                { label: "Cabinet", value: selectedLineageEdge.cabinetPath },
                { label: "Run ID", value: selectedLineageEdge.runId },
                {
                  label: "Policy Decision",
                  value: selectedLineageEdge.policyDecisionId,
                },
                { label: "Created", value: selectedLineageEdge.createdAt },
              ]}
              evidence={selectedLineageEdge.evidence}
              spine={selectedLineageEdge.operationalSpine}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
