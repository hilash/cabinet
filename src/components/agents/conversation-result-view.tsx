"use client";

import { ExternalLink, FileText, Files, PackageOpen, Sparkles } from "lucide-react";
import type { ConversationDetail } from "@/types/conversations";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
        {value}
      </div>
    </div>
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
      <div className="space-y-4 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">Requested Prompt</h4>
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
              {detail.request || detail.meta.title}
            </pre>
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">Result</h4>
            </div>
            <div className="space-y-4">
              <Field label="Summary" value={detail.meta.summary || "No summary captured."} />
              {detail.meta.contextSummary ? (
                <Field label="Context" value={detail.meta.contextSummary} />
              ) : null}
              <Field label="Status" value={detail.meta.status} />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PackageOpen className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">Artifacts</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => window.open(transcriptUrl, "_blank", "noopener,noreferrer")}
            >
              <Files className="h-3.5 w-3.5" />
              Open transcript
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {detail.artifacts.length > 0 ? (
            <div className="space-y-2">
              {detail.artifacts.map((artifact) => (
                <div
                  key={artifact.path}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">
                      {artifact.label || artifact.path}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{artifact.path}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => onOpenArtifact(artifact.path)}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-[12px] text-muted-foreground">
              No artifacts were recorded for this run.
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
