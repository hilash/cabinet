"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Crown,
  HeartPulse,
  Loader2,
  MessageSquare,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import type { ConversationMeta } from "@/types/conversations";
import { KBEditor } from "@/components/editor/editor";
import { HeaderActions } from "@/components/layout/header-actions";
import { VersionHistory } from "@/components/editor/version-history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cronToHuman, cronToShortLabel } from "@/lib/agents/cron-utils";
import { CABINET_VISIBILITY_OPTIONS } from "@/lib/cabinets/visibility";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type {
  CabinetAgentSummary,
  CabinetJobSummary,
  CabinetOverview,
} from "@/types/cabinets";

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function rankAgentType(type?: string): number {
  if (type === "lead") return 0;
  if (type === "specialist") return 1;
  if (type === "support") return 2;
  return 3;
}

function sortOrgAgents(a: CabinetAgentSummary, b: CabinetAgentSummary): number {
  if (a.cabinetDepth !== b.cabinetDepth) return a.cabinetDepth - b.cabinetDepth;
  const typeRank = rankAgentType(a.type) - rankAgentType(b.type);
  if (typeRank !== 0) return typeRank;
  if ((b.active ? 1 : 0) !== (a.active ? 1 : 0)) return (b.active ? 1 : 0) - (a.active ? 1 : 0);
  return a.name.localeCompare(b.name);
}

function findChiefAgent(agents: CabinetAgentSummary[]): CabinetAgentSummary | null {
  const ordered = [...agents].sort(sortOrgAgents);
  return (
    ordered.find((a) => a.slug.toLowerCase() === "ceo") ||
    ordered.find((a) => a.name.trim().toLowerCase() === "ceo") ||
    ordered.find((a) => a.role.toLowerCase().includes("chief executive")) ||
    ordered.find((a) => a.type === "lead") ||
    null
  );
}

/* ─── Stat Pill ─── */
function StatPill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        highlight
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {value} {label}
    </span>
  );
}

/* ─── Agents List ─── */
function CompactOrgChart({
  cabinetName,
  agents,
  onAgentClick,
}: {
  cabinetName: string;
  agents: CabinetAgentSummary[];
  onAgentClick?: (agent: CabinetAgentSummary) => void;
}) {
  const chiefAgent = findChiefAgent(agents);
  const allAgents = [...agents].sort(sortOrgAgents);

  // Group by department for section labels
  const grouped = Object.entries(
    allAgents.reduce<Record<string, CabinetAgentSummary[]>>((acc, agent) => {
      const dept = agent.department || "general";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(agent);
      return acc;
    }, {})
  )
    .sort(([l], [r]) => {
      if (l === "executive") return -1;
      if (r === "executive") return 1;
      if (l === "general") return 1;
      if (r === "general") return -1;
      return startCase(l).localeCompare(startCase(r));
    })
    .map(([dept, deptAgents]) => ({
      dept,
      label: startCase(dept),
      agents: deptAgents.sort(sortOrgAgents),
    }));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Agents</p>
        </div>
        <span className="text-xs text-muted-foreground">{agents.length}</span>
      </div>

      <ScrollArea className="max-h-[480px]">
        {allAgents.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No agents configured for this cabinet.
          </p>
        ) : (
          grouped.map((group, gi) => (
            <div key={group.dept}>
              {/* Department label */}
              <p className={cn(
                "px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50 bg-muted/30",
                gi > 0 && "border-t border-border/50"
              )}>
                {group.label}
              </p>
              <div className="divide-y divide-border/40">
                {group.agents.map((agent) => {
                  const isChief = agent.slug === chiefAgent?.slug;
                  return (
                    <div
                      key={agent.scopedId}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        onAgentClick && "cursor-pointer hover:bg-muted/40 transition-colors"
                      )}
                      onClick={() => onAgentClick?.(agent)}
                    >
                      <span className="text-lg leading-none w-6 text-center shrink-0">
                        {agent.emoji || "🤖"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{agent.name}</p>
                          {isChief && (
                            <Crown className="h-3 w-3 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{agent.role}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {agent.heartbeat && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {cronToShortLabel(agent.heartbeat)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            agent.active ? "bg-emerald-500" : "bg-muted-foreground/25"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

/* ─── Schedules Panel ─── */
function SchedulesPanel({
  cabinetPath,
  agents,
  jobs,
}: {
  cabinetPath: string;
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
}) {
  const agentNameBySlug = useMemo(
    () => new Map(agents.map((a) => [a.scopedId, a.name])),
    [agents]
  );
  const heartbeatAgents = agents
    .filter((a) => a.heartbeat)
    .sort((l, r) => l.name.localeCompare(r.name));
  const jobsWithOwners = jobs.map((job) => ({
    ...job,
    ownerName: job.ownerScopedId
      ? agentNameBySlug.get(job.ownerScopedId) || job.ownerAgent || null
      : job.ownerAgent || null,
  }));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Jobs */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Clock3 className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Jobs</p>
          <p className="text-xs text-muted-foreground">
            {jobsWithOwners.length} scheduled {jobsWithOwners.length === 1 ? "job" : "jobs"}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {jobsWithOwners.length > 0 ? (
          jobsWithOwners.map((job) => (
            <div key={job.scopedId} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{job.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {job.ownerName ? `${job.ownerName} · ` : ""}
                  {cronToHuman(job.schedule)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  job.enabled
                    ? "bg-emerald-500/12 text-emerald-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {job.enabled ? "On" : "Off"}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-xs text-muted-foreground">No cabinet jobs configured yet.</p>
        )}
      </div>

      {/* Heartbeats */}
      <div className="flex items-center gap-2.5 border-b border-t border-border px-4 py-3">
        <HeartPulse className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Heartbeats</p>
          <p className="text-xs text-muted-foreground">
            {heartbeatAgents.length} {heartbeatAgents.length === 1 ? "agent" : "agents"} on a rhythm
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {heartbeatAgents.length > 0 ? (
          heartbeatAgents.map((agent) => (
            <div key={agent.scopedId} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg leading-none shrink-0">{agent.emoji || "🤖"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{agent.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {cronToHuman(agent.heartbeat || "")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                {cronToShortLabel(agent.heartbeat || "")}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-xs text-muted-foreground">No heartbeats configured yet.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Conversations helpers ─── */

function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TRIGGER_STYLES: Record<ConversationMeta["trigger"], string> = {
  manual: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20",
  job: "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20",
  heartbeat: "bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/20",
};

const TRIGGER_LABELS: Record<ConversationMeta["trigger"], string> = {
  manual: "Manual",
  job: "Job",
  heartbeat: "Heartbeat",
};

function TriggerIcon({ trigger }: { trigger: ConversationMeta["trigger"] }) {
  if (trigger === "job") return <Clock3 className="h-2.5 w-2.5" />;
  if (trigger === "heartbeat") return <HeartPulse className="h-2.5 w-2.5" />;
  return <Bot className="h-2.5 w-2.5" />;
}

function StatusIcon({ status }: { status: ConversationMeta["status"] }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

/* ─── Task Composer ─── */
function CabinetTaskComposer({
  cabinetPath,
  agents,
  cabinetName,
  onNavigate,
}: {
  cabinetPath: string;
  agents: CabinetAgentSummary[];
  cabinetName: string;
  onNavigate: (agentSlug: string, agentCabinetPath: string, conversationId: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<CabinetAgentSummary | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select first active own-cabinet agent on load
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      const first =
        agents.find((a) => a.cabinetDepth === 0 && a.active) ||
        agents.find((a) => a.active) ||
        agents[0];
      setSelectedAgent(first);
    }
  }, [agents, selectedAgent]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [prompt]);

  const activeAgents = agents.filter((a) => a.active);
  const ownAgents = activeAgents.filter((a) => a.cabinetDepth === 0);
  const childAgentGroups = activeAgents
    .filter((a) => a.cabinetDepth > 0)
    .reduce<Record<string, CabinetAgentSummary[]>>((acc, agent) => {
      const key = agent.cabinetName || agent.cabinetPath;
      if (!acc[key]) acc[key] = [];
      acc[key].push(agent);
      return acc;
    }, {});

  async function submit(text: string) {
    if (!text.trim() || submitting || !selectedAgent) return;
    setSubmitting(true);
    try {
      const agentCabinetPath = selectedAgent.cabinetPath || cabinetPath;
      const res = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: selectedAgent.slug,
          userMessage: text.trim(),
          mentionedPaths: [],
          cabinetPath: agentCabinetPath,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrompt("");
        onNavigate(selectedAgent.slug, agentCabinetPath, data.conversation?.id);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  const placeholder = selectedAgent
    ? `What should ${selectedAgent.name} work on?`
    : "Select an agent above…";

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      {/* Heading */}
      <p className="mb-4 text-sm font-semibold text-foreground">
        What are we working on in{" "}
        <span className="text-muted-foreground font-normal">{cabinetName}</span>?
      </p>

      {/* Agent selector */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Own cabinet agents */}
        {ownAgents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ownAgents.map((agent) => (
              <button
                key={agent.scopedId}
                onClick={() => {
                  setSelectedAgent(agent);
                  textareaRef.current?.focus();
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                  selectedAgent?.scopedId === agent.scopedId
                    ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm"
                    : "border-border bg-background text-foreground hover:border-border/80 hover:bg-muted/50"
                )}
              >
                <span className="text-base leading-none">{agent.emoji}</span>
                {agent.name}
              </button>
            ))}
          </div>
        )}

        {/* Child cabinet agents grouped by cabinet */}
        {Object.entries(childAgentGroups).map(([groupName, groupAgents]) => (
          <div key={groupName} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 pr-1">
              {groupName}
            </span>
            {groupAgents.map((agent) => (
              <button
                key={agent.scopedId}
                onClick={() => {
                  setSelectedAgent(agent);
                  textareaRef.current?.focus();
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                  selectedAgent?.scopedId === agent.scopedId
                    ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm"
                    : "border-border bg-background text-foreground hover:border-border/80 hover:bg-muted/50"
                )}
              >
                <span className="text-base leading-none">{agent.emoji}</span>
                {agent.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Textarea + send */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              void submit(prompt);
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              setPrompt((p) => p + "\n");
            }
          }}
          placeholder={placeholder}
          disabled={submitting || !selectedAgent}
          rows={1}
          className={cn(
            "w-full resize-none rounded-lg border border-border bg-background px-4 py-3 pr-12",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            "shadow-sm transition-shadow",
            (!selectedAgent || submitting) && "opacity-60"
          )}
        />
        <button
          onClick={() => void submit(prompt)}
          disabled={!prompt.trim() || submitting || !selectedAgent}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            prompt.trim() && !submitting && selectedAgent
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/60">
        Enter to send · ⌘↵ new line
      </p>
    </div>
  );
}

/* ─── Recent Conversations ─── */
function RecentConversations({
  cabinetPath,
  visibilityMode,
  agents,
  onOpen,
}: {
  cabinetPath: string;
  visibilityMode: string;
  agents: { slug: string; emoji: string; name: string; cabinetPath?: string }[];
  onOpen: (conv: ConversationMeta) => void;
}) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const agentBySlug = useMemo(() => {
    const map = new Map<string, { emoji: string; name: string }>();
    for (const a of agents) map.set(a.slug, { emoji: a.emoji, name: a.name });
    return map;
  }, [agents]);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ cabinetPath, limit: "20" });
      if (visibilityMode !== "own") params.set("visibilityMode", visibilityMode);
      const res = await fetch(`/api/agents/conversations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setConversations((data.conversations || []) as ConversationMeta[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [cabinetPath, visibilityMode]);

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => void refresh(), 6000);
    return () => clearInterval(iv);
  }, [refresh]);

  const hasRunning = conversations.some((c) => c.status === "running");

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Recent Conversations</p>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${conversations.length} conversations`}
              {hasRunning && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                  {conversations.filter((c) => c.status === "running").length} running
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading conversations…
        </div>
      ) : conversations.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">
          No conversations yet. Run a heartbeat or send a task to an agent.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {conversations.map((conv) => {
            const agent = agentBySlug.get(conv.agentSlug);
            return (
              <button
                key={conv.id}
                onClick={() => onOpen(conv)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                {/* Status */}
                <StatusIcon status={conv.status} />

                {/* Agent */}
                <span className="shrink-0 text-base leading-none" title={agent?.name || conv.agentSlug}>
                  {agent?.emoji || "🤖"}
                </span>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-snug">{conv.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {agent?.name || conv.agentSlug}
                    {conv.summary ? ` · ${conv.summary}` : ""}
                  </p>
                </div>

                {/* Trigger pill */}
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    TRIGGER_STYLES[conv.trigger]
                  )}
                  title={TRIGGER_LABELS[conv.trigger]}
                >
                  <TriggerIcon trigger={conv.trigger} />
                  {TRIGGER_LABELS[conv.trigger]}
                </span>

                {/* Time */}
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {formatRelative(conv.startedAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main View ─── */
export function CabinetView({ cabinetPath }: { cabinetPath: string }) {
  const [overview, setOverview] = useState<CabinetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectPage = useTreeStore((state) => state.selectPage);
  const loadPage = useEditorStore((state) => state.loadPage);
  const setSection = useAppStore((state) => state.setSection);
  const cabinetVisibilityModes = useAppStore((state) => state.cabinetVisibilityModes);
  const setCabinetVisibilityMode = useAppStore((state) => state.setCabinetVisibilityMode);
  const cabinetVisibilityMode = cabinetVisibilityModes[cabinetPath] || "own";

  const openCabinet = useCallback(
    (path: string) => {
      selectPage(path);
      void loadPage(path);
      setSection({
        type: "cabinet",
        mode: "cabinet",
        cabinetPath: path,
      });
    },
    [loadPage, selectPage, setSection]
  );

  const openCabinetAgent = useCallback(
    (agent: CabinetAgentSummary) => {
      const targetCabinetPath = agent.cabinetPath || cabinetPath;
      setSection({
        type: "agent",
        mode: "cabinet",
        slug: agent.slug,
        cabinetPath: targetCabinetPath,
        agentScopedId: agent.scopedId || `${targetCabinetPath}::agent::${agent.slug}`,
      });
    },
    [cabinetPath, setSection]
  );

  const openCabinetAgentsWorkspace = useCallback(() => {
    setSection({
      type: "agents",
      mode: "cabinet",
      cabinetPath,
    });
  }, [cabinetPath, setSection]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ path: cabinetPath, visibility: cabinetVisibilityMode });
      const response = await fetch(`/api/cabinets/overview?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to load cabinet overview");
      }
      const data = (await response.json()) as CabinetOverview;
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [cabinetPath, cabinetVisibilityMode]);

  useEffect(() => {
    void loadOverview();
    const interval = window.setInterval(() => void loadOverview(), 15000);
    const onFocus = () => void loadOverview();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadOverview]);

  const cabinetName =
    overview?.cabinet.name ||
    cabinetPath.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
    "Cabinet";
  const cabinetDescription =
    overview?.cabinet.description ||
    "Portable software layer for agents, jobs, and knowledge.";
  const activeAgents = overview?.agents.filter((a) => a.active).length ?? 0;
  const heartbeatCount = overview?.agents.filter((a) => Boolean(a.heartbeat)).length ?? 0;
  const childCabinetCount = overview?.children.length ?? 0;
  const visibleCabinetCount = overview?.visibleCabinets.length ?? 0;
  const cabinetPathLabel = cabinetPath === "." ? "/" : `/${cabinetPath}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border/70 bg-background/95 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-1">
          <VersionHistory />
          <HeaderActions />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
            <div className="h-24 bg-gradient-to-r from-primary/14 via-primary/8 to-transparent sm:h-28" />
            <div className="-mt-8 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                {overview?.parent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCabinet(overview.parent!.path)}
                    className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to {overview.parent.name}
                  </Button>
                ) : null}

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                        <Archive className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          {overview?.cabinet.kind || "cabinet"}
                        </span>
                        <div>
                          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.45rem]">
                            {cabinetName}
                          </h1>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            {cabinetDescription}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatPill value={overview?.agents.length ?? 0} label="agents" />
                      <StatPill value={activeAgents} label="active" highlight />
                      <StatPill value={overview?.jobs.length ?? 0} label="jobs" />
                      <StatPill value={heartbeatCount} label="heartbeats" />
                      <StatPill value={childCabinetCount} label="child cabinets" />
                      <StatPill value={visibleCabinetCount} label="visible cabinets" />
                      <span className="rounded-full bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
                        {cabinetPathLabel}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-3 xl:min-w-[260px]">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Visible Agent Scope
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {CABINET_VISIBILITY_OPTIONS.find((option) => option.value === cabinetVisibilityMode)?.label ||
                          "Own agents only"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {CABINET_VISIBILITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setCabinetVisibilityMode(cabinetPath, option.value)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                            cabinetVisibilityMode === option.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {option.shortLabel}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full justify-start gap-2"
                      onClick={openCabinetAgentsWorkspace}
                    >
                      <Users className="h-4 w-4" />
                      Open Agents Workspace
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-h-[680px] flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Cabinet Notes</p>
                  <p className="text-xs text-muted-foreground">
                    Showing this cabinet&apos;s index page for now
                  </p>
                </div>
              </div>
              <KBEditor />
            </div>

            <div className="flex flex-col gap-4">
              {loading && !overview ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading overview…
                </div>
              ) : error && !overview ? (
                <div className="rounded-xl border border-destructive/20 bg-card px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : overview ? (
                <>
                  <CompactOrgChart
                    cabinetName={cabinetName}
                    agents={overview.agents}
                    onAgentClick={openCabinetAgent}
                  />
                  <SchedulesPanel
                    cabinetPath={cabinetPath}
                    agents={overview.agents}
                    jobs={overview.jobs}
                  />
                </>
              ) : null}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
