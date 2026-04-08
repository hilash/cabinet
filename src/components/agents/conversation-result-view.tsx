"use client";

import { ExternalLink, FileText, Files, PackageOpen, Sparkles, CheckCircle, XCircle, Clock } from "lucide-react";
import type { ConversationDetail } from "@/types/conversations";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const Icon = isCompleted ? CheckCircle : isFailed ? XCircle : Clock;
  const color = isCompleted
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : isFailed
      ? "text-red-400 bg-red-400/10 border-red-400/20"
      : "text-amber-400 bg-amber-400/10 border-amber-400/20";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export function ConversationResultView({
  detail,
  onOpenArtifact,
}: {
  detail: ConversationDetail;
  onOpenArtifact: (path: string) => void;
}) {
  const transcriptUrl = `/agents/conversations/${detail.meta.id}`;

  return (
    <ScrollArea
      className="h-full"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        {/* Prompt */}
        <section className="rounded-2xl border border-border bg-muted/10 p-5">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Prompt</h4>
          </div>
          <p className="break-words text-[14px] leading-relaxed text-foreground">
            {detail.request || detail.meta.title}
          </p>
        </section>

        {/* Result */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">Result</h4>
            </div>
            <StatusBadge status={detail.meta.status} />
          </div>

          {detail.meta.summary ? (
            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {detail.meta.summary}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">No summary captured.</p>
          )}

          {detail.meta.contextSummary ? (
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Context
              </div>
              <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {detail.meta.contextSummary}
              </p>
            </div>
          ) : null}
        </section>

        {/* Artifacts */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageOpen className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">
                Artifacts
                {detail.artifacts.length > 0 && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    ({detail.artifacts.length})
                  </span>
                )}
              </h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => window.open(transcriptUrl, "_blank", "noopener,noreferrer")}
            >
              <Files className="h-3.5 w-3.5" />
              Open transcript
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {detail.artifacts.length > 0 ? (
            <div className="space-y-2">
              {detail.artifacts.map((artifact) => (
                <button
                  key={artifact.path}
                  onClick={() => onOpenArtifact(artifact.path)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {artifact.label || artifact.path.split("/").pop()}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{artifact.path}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[12px] text-muted-foreground">
              No artifacts were recorded for this run.
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
