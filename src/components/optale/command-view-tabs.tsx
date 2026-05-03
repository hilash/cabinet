"use client";

import { cn } from "@/lib/utils";
import type { OptaleCommandView } from "@/components/optale/command-workspace-types";

const COMMAND_VIEW_LABELS: Record<OptaleCommandView, string> = {
  actions: "Actions",
  runs: "Runs",
  policy: "Policy",
  lineage: "Lineage",
  audit: "Audit",
};

export function OptaleCommandViewTabs({
  activeView,
  views,
  onSelectView,
}: {
  activeView: OptaleCommandView;
  views: Array<{ id: OptaleCommandView; count: number }>;
  onSelectView: (view: OptaleCommandView) => void;
}) {
  return (
    <section className="border-b border-border/70 px-6 py-3">
      <div className="flex flex-wrap gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelectView(view.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              activeView === view.id
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{COMMAND_VIEW_LABELS[view.id]}</span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px]",
                activeView === view.id
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {view.count}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
