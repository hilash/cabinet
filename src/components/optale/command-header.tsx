"use client";

import { Command, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function OptaleCommandHeader({
  generatedAt,
  loading,
  onRefresh,
}: {
  generatedAt?: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="border-b border-border/70 px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
            <Command className="size-3.5" />
            Optale Command
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Action Registry
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Command actions, agent proposal types, and pending review queues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {generatedAt ? (
            <span className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
              {formatGeneratedAt(generatedAt)}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}
