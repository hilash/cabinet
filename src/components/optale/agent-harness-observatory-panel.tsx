"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardRecord = Record<string, unknown>;

interface ObservatoryRun {
  id: string;
  title: string;
  status: string;
  agent?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

interface ObservatorySummary {
  total: number;
  running: number;
  succeeded: number;
  failed: number;
}

interface ObservatoryDashboard {
  generatedAt?: string;
  summary: ObservatorySummary;
  runs: ObservatoryRun[];
}

const DASHBOARD_ENDPOINT = "/api/optale/observatory/dashboard?hours=24&limit=20";

function isRecord(value: unknown): value is DashboardRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): DashboardRecord {
  return isRecord(value) ? value : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value: unknown): string {
  return (readString(value) || "unknown").toLowerCase().replace(/\s+/g, "_");
}

function normalizeRun(value: unknown, index: number): ObservatoryRun {
  const record = readRecord(value);
  const agent = readRecord(record.agent);
  const timing = readRecord(record.timing);
  const id =
    readString(record.id) ||
    readString(record.runId) ||
    readString(record.traceId) ||
    `run-${index}`;
  return {
    id,
    title:
      readString(record.title) ||
      readString(record.name) ||
      readString(record.task) ||
      readString(record.prompt) ||
      id,
    status: normalizeStatus(record.status ?? record.state ?? record.outcome),
    agent:
      readString(record.agent) ||
      readString(record.agentId) ||
      readString(record.persona) ||
      readString(agent.id) ||
      readString(agent.name),
    startedAt:
      readString(record.startedAt) ||
      readString(record.started_at) ||
      readString(record.createdAt) ||
      readString(record.created_at) ||
      readString(timing.startedAt),
    finishedAt:
      readString(record.finishedAt) ||
      readString(record.finished_at) ||
      readString(record.completedAt) ||
      readString(record.completed_at) ||
      readString(timing.finishedAt),
    durationMs:
      readNumber(record.durationMs) ||
      readNumber(record.duration_ms) ||
      readNumber(timing.durationMs),
  };
}

function pickRuns(payload: DashboardRecord): ObservatoryRun[] {
  const dashboard = readRecord(payload.dashboard);
  const candidates = [
    payload.recentRuns,
    payload.runs,
    payload.items,
    dashboard.recentRuns,
    dashboard.runs,
    dashboard.items,
  ];
  const runs = candidates.find((candidate) => Array.isArray(candidate));
  return readArray(runs).map(normalizeRun);
}

function statusMatches(status: string, values: string[]) {
  return values.some((value) => status.includes(value));
}

function numberFromSummary(summary: DashboardRecord, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(summary[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function countStatusMap(statusMap: DashboardRecord, values: string[]): number {
  let total = 0;
  for (const [key, value] of Object.entries(statusMap)) {
    if (values.some((status) => normalizeStatus(key).includes(status))) {
      total += readNumber(value) ?? 0;
    }
  }
  return total;
}

function sumStatusMap(statusMap: DashboardRecord): number {
  return Object.values(statusMap).reduce<number>((total, value) => total + (readNumber(value) ?? 0), 0);
}

function normalizeDashboard(payload: unknown): ObservatoryDashboard {
  const record = readRecord(payload);
  const dashboard = readRecord(record.dashboard);
  const summary = {
    ...readRecord(dashboard.summary),
    ...readRecord(record.summary),
    ...readRecord(record.counts),
    ...readRecord(dashboard.counts),
  };
  const runsByStatus = readRecord(summary.runsByStatus);
  const runs = pickRuns(record);
  const totalFromStatus = sumStatusMap(runsByStatus);
  const runningFromStatus = countStatusMap(runsByStatus, ["running", "active", "processing", "queued"]);
  const succeededFromStatus = countStatusMap(runsByStatus, ["success", "succeeded", "passed", "completed"]);
  const failedFromStatus = countStatusMap(runsByStatus, ["fail", "error", "rejected"]);
  const runningFromRuns = runs.filter((run) => statusMatches(run.status, ["running", "active", "processing", "queued"])).length;
  const succeededFromRuns = runs.filter((run) => statusMatches(run.status, ["success", "succeeded", "passed", "completed"])).length;
  const failedFromRuns = runs.filter((run) => statusMatches(run.status, ["fail", "error", "rejected"])).length;
  return {
    generatedAt: readString(record.generatedAt) || readString(dashboard.generatedAt),
    summary: {
      total: numberFromSummary(summary, ["total", "totalRuns", "runs", "runCount"]) ?? (totalFromStatus || runs.length),
      running:
        numberFromSummary(summary, ["running", "active", "inFlight", "inProgress"]) ??
        (runningFromStatus || runningFromRuns),
      succeeded:
        numberFromSummary(summary, ["succeeded", "success", "passed", "completed"]) ??
        (succeededFromStatus || succeededFromRuns),
      failed:
        numberFromSummary(summary, ["failed", "failure", "errored", "errors"]) ??
        (failedFromStatus || failedFromRuns),
    },
    runs,
  };
}

function statusClass(status: string) {
  if (statusMatches(status, ["success", "succeeded", "passed", "completed"])) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (statusMatches(status, ["running", "active", "processing", "queued"])) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  if (statusMatches(status, ["fail", "error", "rejected"])) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}

function numberLabel(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function shortDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(value?: number) {
  if (value === undefined) return "-";
  if (value < 1000) return `${Math.round(value)}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value / 60_000)}m`;
}

export function AgentHarnessObservatoryPanel() {
  const [data, setData] = useState<ObservatoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(DASHBOARD_ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Observatory request failed: ${response.status}`);
      }
      setData(normalizeDashboard(await response.json()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Observatory request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counters = useMemo(
    () => [
      {
        label: "Runs",
        value: data ? numberLabel(data.summary.total) : "-",
        sub: "last 24h",
        icon: <Server className="size-4 text-primary" />,
      },
      {
        label: "Running",
        value: data ? numberLabel(data.summary.running) : "-",
        sub: "active or queued",
        icon: <Clock3 className="size-4 text-sky-500" />,
      },
      {
        label: "Succeeded",
        value: data ? numberLabel(data.summary.succeeded) : "-",
        sub: "completed cleanly",
        icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      },
      {
        label: "Failed",
        value: data ? numberLabel(data.summary.failed) : "-",
        sub: "needs attention",
        icon: <XCircle className="size-4 text-destructive" />,
      },
    ],
    [data]
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CircleDot className="size-4 text-primary" />
            <h2 className="text-[14px] font-semibold">Agent Harness Observatory</h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {data?.generatedAt ? `Updated ${shortDate(data.generatedAt)}` : "Last 24 hours"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          <span>Refresh</span>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid overflow-hidden rounded-lg border border-border/70 bg-card sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((counter) => (
          <div key={counter.label} className="border-b border-border/60 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
            <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
              {counter.icon}
              <span>{counter.label}</span>
            </div>
            <div className="text-[28px] font-semibold tracking-tight">{counter.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{counter.sub}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <h2 className="text-[14px] font-semibold">Recent runs</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {data ? `${data.runs.length} loaded` : "Loading"}
          </span>
        </div>
        <div className="divide-y divide-border/60">
          {(data?.runs ?? []).map((run) => (
            <div key={run.id} className="grid min-w-0 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_110px_90px] md:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", statusClass(run.status))}>
                    {run.status.replace(/_/g, " ")}
                  </span>
                  <h3 className="min-w-0 flex-1 truncate text-[13px] font-medium">{run.title}</h3>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {run.id}
                </p>
              </div>
              <div className="truncate text-[12px] text-muted-foreground md:text-right">
                {run.agent || "-"}
              </div>
              <div className="text-[12px] text-muted-foreground md:text-right">
                {shortDate(run.startedAt || run.finishedAt)}
              </div>
              <div className="text-[12px] font-medium md:text-right">
                {durationLabel(run.durationMs)}
              </div>
            </div>
          ))}
          {(data?.runs ?? []).length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-8 text-[12px] text-muted-foreground">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CircleDot className="size-4" />}
              {loading ? "Loading runs" : "No recent harness runs returned"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
