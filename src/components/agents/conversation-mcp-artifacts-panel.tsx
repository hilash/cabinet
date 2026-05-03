import {
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  ServerCog,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { ConversationMcpToolArtifact } from "@/types/conversations";
import { cn } from "@/lib/utils";

function formatDuration(durationMs?: number): string {
  if (typeof durationMs !== "number") return "duration unavailable";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function OutcomeBadge({ outcome }: { outcome: ConversationMcpToolArtifact["outcome"] }) {
  const ok = outcome === "ok";
  const Icon = ok ? CheckCircle2 : TriangleAlert;
  const tone = ok
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
    : "border-rose-500/25 bg-rose-500/10 text-rose-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone
      )}
    >
      <Icon className="size-3" />
      {outcome}
    </span>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ConversationMcpArtifactsPanel({
  artifacts,
  className,
  emptyState = false,
}: {
  artifacts?: ConversationMcpToolArtifact[];
  className?: string;
  emptyState?: boolean;
}) {
  const items = artifacts ?? [];
  if (items.length === 0 && !emptyState) return null;

  return (
    <section className={cn("rounded-2xl border border-border bg-background p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h4 className="text-[13px] font-semibold">
            MCP Sources
            {items.length > 0 ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                ({items.length})
              </span>
            ) : null}
          </h4>
        </div>
        {items.length > 0 ? (
          <span className="rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
            read-only
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[12px] text-muted-foreground">
          No MCP source or tool artifacts were recorded for this run.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((artifact) => (
            <article
              key={artifact.id}
              className="rounded-xl border border-border bg-muted/10 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Wrench className="size-4 shrink-0 text-primary" />
                    <div className="truncate font-mono text-[12px] font-medium text-foreground">
                      {artifact.toolName}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <MetaChip icon={ServerCog}>server {artifact.serverId}</MetaChip>
                    <MetaChip icon={FileSearch}>source {artifact.source}</MetaChip>
                    <MetaChip icon={Clock3}>{formatDuration(artifact.durationMs)}</MetaChip>
                    {artifact.clientId ? (
                      <MetaChip icon={Database}>{artifact.clientId}</MetaChip>
                    ) : null}
                  </div>
                </div>
                <OutcomeBadge outcome={artifact.outcome} />
              </div>

              {artifact.error ? (
                <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] leading-relaxed text-rose-300">
                  {artifact.error}
                </div>
              ) : null}

              {artifact.preview ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground/85">
                  {artifact.preview}
                </p>
              ) : null}

              {artifact.sourcePaths.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Source references
                  </div>
                  <div className="space-y-1.5">
                    {artifact.sourcePaths.map((sourcePath) => (
                      <div
                        key={sourcePath}
                        className="truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground/85"
                      >
                        {sourcePath}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {artifact.argumentKeys && artifact.argumentKeys.length > 0 ? (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Arguments: {artifact.argumentKeys.join(", ")}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
