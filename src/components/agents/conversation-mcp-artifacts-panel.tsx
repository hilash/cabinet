import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { ConversationMcpToolArtifact } from "@/types/conversations";
import { hasOptaleCapability } from "@/lib/optale/capabilities";
import { cn } from "@/lib/utils";

function formatDuration(durationMs?: number): string {
  if (typeof durationMs !== "number") return "duration unavailable";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function OutcomeBadge({
  outcome,
}: {
  outcome: ConversationMcpToolArtifact["outcome"];
}) {
  const ok = outcome === "ok";
  const Icon = ok ? CheckCircle2 : TriangleAlert;
  const tone = ok
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
    : "border-rose-500/25 bg-rose-500/10 text-rose-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
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

function displayToken(value: string | undefined): string {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toolDisplayLabel(artifact: ConversationMcpToolArtifact): string {
  return (
    artifact.productToolLabel ||
    artifact.productToolName ||
    (hasOptaleCapability("diagnostics.raw") ? artifact.toolName : "Managed tool")
  );
}

function toolDisplayName(artifact: ConversationMcpToolArtifact): string {
  return (
    artifact.productToolName ||
    artifact.productToolLabel ||
    (hasOptaleCapability("diagnostics.raw") ? artifact.toolName : "Managed tool")
  );
}

function sourceTypeLabel(value: string): string {
  if (value === "mcp") return "Tool source";
  if (value === "vault") return "Vault source";
  if (value === "memory") return "Memory source";
  if (value === "artifact") return "Artifact";
  return displayToken(value) || "Source";
}

function isDiagnosticPath(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("/") ||
    normalized.startsWith("file:") ||
    normalized.startsWith("mcp:") ||
    normalized.startsWith("mcp-server:") ||
    normalized.includes("/.agents/") ||
    normalized.includes(".agents/")
  );
}

function visibleSourcePath(
  path: string | undefined,
  showDiagnostics: boolean,
): string | undefined {
  if (!path) return undefined;
  if (!showDiagnostics && isDiagnosticPath(path)) return undefined;
  return path;
}

function sourceCount(
  artifact: ConversationMcpToolArtifact,
  showDiagnostics: boolean,
): number {
  if (artifact.sources.length > 0) {
    return artifact.sources.filter((source) =>
      visibleSourcePath(source.path, showDiagnostics) !== undefined ||
      !source.path,
    ).length;
  }
  return artifact.sourcePaths.filter(
    (path) => visibleSourcePath(path, showDiagnostics) !== undefined,
  ).length;
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
  const showDiagnostics = hasOptaleCapability("diagnostics.raw");
  const totalSources = items.reduce(
    (sum, item) => sum + sourceCount(item, showDiagnostics),
    0,
  );
  const issueCount = items.filter((item) => item.outcome !== "ok").length;
  if (items.length === 0 && !emptyState) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-background p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h4 className="text-[13px] font-semibold">
            Sources & Tools
            {items.length > 0 ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                ({items.length})
              </span>
            ) : null}
          </h4>
        </div>
        {items.length > 0 ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <span className="rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
              {totalSources} {totalSources === 1 ? "source" : "sources"}
            </span>
            {issueCount > 0 ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                {issueCount} with issues
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[12px] text-muted-foreground">
          No tool source artifacts were recorded for this run.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((artifact) => {
            const sources = artifact.sources ?? [];
            const displayLabel = toolDisplayLabel(artifact);
            const displayName = toolDisplayName(artifact);
            const visibleSourcePaths = showDiagnostics
              ? artifact.sourcePaths
              : artifact.sourcePaths.filter((path) => !isDiagnosticPath(path));
            return (
              <article
                key={artifact.id}
                className="rounded-xl border border-border bg-muted/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Wrench className="size-4 shrink-0 text-primary" />
                      <div className="truncate text-[13px] font-medium text-foreground">
                        {displayLabel}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <MetaChip icon={Wrench}>{displayName}</MetaChip>
                      <MetaChip icon={FileSearch}>
                        {sourceCount(artifact, showDiagnostics)}{" "}
                        {sourceCount(artifact, showDiagnostics) === 1
                          ? "source"
                          : "sources"}
                      </MetaChip>
                      <MetaChip icon={Clock3}>
                        {formatDuration(artifact.durationMs)}
                      </MetaChip>
                      {showDiagnostics && artifact.clientId ? (
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

                {artifact.preview && sources.length === 0 ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground/85">
                    {artifact.preview}
                  </p>
                ) : null}

                {sources.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Sources
                    </div>
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className="rounded-xl border border-border bg-background px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <BookOpen className="size-4 shrink-0 text-primary" />
                                <div className="truncate text-[13px] font-medium text-foreground">
                                  {source.title}
                                </div>
                              </div>
                              {visibleSourcePath(source.path, showDiagnostics) ? (
                                <div className="truncate font-mono text-[11px] text-muted-foreground">
                                  {visibleSourcePath(source.path, showDiagnostics)}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                              <span className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {sourceTypeLabel(source.sourceType)}
                              </span>
                              <span className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {formatDuration(source.durationMs)}
                              </span>
                              <OutcomeBadge outcome={source.outcome} />
                            </div>
                          </div>
                          {source.snippet ? (
                            <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/80">
                              {source.snippet}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : visibleSourcePaths.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Source references
                    </div>
                    <div className="space-y-1.5">
                      {visibleSourcePaths.map((sourcePath) => (
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

                {showDiagnostics &&
                artifact.argumentKeys &&
                artifact.argumentKeys.length > 0 ? (
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    Arguments: {artifact.argumentKeys.join(", ")}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
