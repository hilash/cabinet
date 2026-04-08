"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bot,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { ConversationResultView } from "@/components/agents/conversation-result-view";
import { cronToHuman } from "@/lib/agents/cron-utils";
import { openKnowledgeBasePage } from "@/lib/navigation/open-page";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import type { ConversationDetail, ConversationMeta } from "@/types/conversations";
import type { JobConfig } from "@/types/jobs";
import type { JobLibraryTemplate } from "@/lib/jobs/job-library";

type StatusFilter = "all" | "running" | "failed";
type MainPanelMode = "settings" | "conversation";

interface AgentSummary {
  name: string;
  slug: string;
  emoji: string;
  active: boolean;
  runningCount?: number;
  heartbeat?: string;
  role?: string;
  body?: string;
}

interface PersonaResponse {
  persona: AgentSummary;
}

const TRIGGER_LABELS: Record<ConversationMeta["trigger"], string> = {
  manual: "Manual",
  job: "Job",
  heartbeat: "Heartbeat",
};

const TRIGGER_STYLES: Record<ConversationMeta["trigger"], string> = {
  manual: "bg-blue-500/10 text-blue-500",
  job: "bg-amber-500/10 text-amber-500",
  heartbeat: "bg-emerald-500/10 text-emerald-500",
};

function statusFromFilter(filter: StatusFilter): ConversationMeta["status"] | undefined {
  if (filter === "all") return undefined;
  return filter;
}

function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isScheduledRun(conversation: ConversationMeta): boolean {
  return conversation.trigger === "job" || conversation.trigger === "heartbeat";
}

function blankJobDraft(agentSlug: string): JobConfig {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    enabled: true,
    schedule: "0 9 * * 1-5",
    provider: "claude-code",
    agentSlug,
    prompt: "",
    timeout: 600,
    createdAt: now,
    updatedAt: now,
  };
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function JobsManager() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [jobs, setJobs] = useState<JobConfig[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDraft, setJobDraft] = useState<JobConfig | null>(null);
  const [heartbeatDraft, setHeartbeatDraft] = useState("");
  const [libraryTemplates, setLibraryTemplates] = useState<JobLibraryTemplate[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mode, setMode] = useState<MainPanelMode>("settings");
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [savingJob, setSavingJob] = useState(false);
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);
  const [runningHeartbeat, setRunningHeartbeat] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const selectPage = useTreeStore((state) => state.selectPage);
  const expandPath = useTreeStore((state) => state.expandPath);
  const setSection = useAppStore((state) => state.setSection);
  const loadPage = useEditorStore((state) => state.loadPage);

  function openArtifactPage(rawPath: string) {
    openKnowledgeBasePage({
      rawPath,
      expandPath,
      selectPage,
      setPageSection: () => setSection({ type: "page" }),
      loadPage,
    });
  }

  async function refreshAgents() {
    setLoadingAgents(true);
    try {
      const response = await fetch("/api/agents/personas");
      if (!response.ok) return;
      const data = await response.json();
      setAgents((data.personas || []) as AgentSummary[]);
    } finally {
      setLoadingAgents(false);
    }
  }

  async function refreshSelectedAgent(agentSlug: string | null) {
    if (!agentSlug) {
      setSelectedAgent(null);
      setJobs([]);
      setHeartbeatDraft("");
      setSelectedJobId(null);
      setJobDraft(null);
      return;
    }

    const [personaResponse, jobsResponse] = await Promise.all([
      fetch(`/api/agents/personas/${agentSlug}`),
      fetch(`/api/agents/${agentSlug}/jobs`),
    ]);

    if (personaResponse.ok) {
      const data = (await personaResponse.json()) as PersonaResponse;
      setSelectedAgent(data.persona);
      setHeartbeatDraft(data.persona.heartbeat || "");
    }

    if (jobsResponse.ok) {
      const data = await jobsResponse.json();
      setJobs((data.jobs || []) as JobConfig[]);
    } else {
      setJobs([]);
    }
  }

  async function refreshConversations() {
    setLoadingConversations(true);
    try {
      const params = new URLSearchParams();
      if (selectedAgentSlug) params.set("agent", selectedAgentSlug);
      const status = statusFromFilter(statusFilter);
      if (status) params.set("status", status);
      params.set("limit", "200");

      const response = await fetch(`/api/agents/conversations?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      setConversations(
        ((data.conversations || []) as ConversationMeta[]).filter(isScheduledRun)
      );
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadConversationDetail(conversationId: string | null) {
    if (!conversationId) {
      setSelectedConversation(null);
      return;
    }
    const response = await fetch(`/api/agents/conversations/${conversationId}`);
    if (!response.ok) return;
    setSelectedConversation((await response.json()) as ConversationDetail);
  }

  async function refreshLibrary() {
    const response = await fetch("/api/jobs/library");
    if (!response.ok) return;
    const data = await response.json();
    setLibraryTemplates((data.templates || []) as JobLibraryTemplate[]);
  }

  useEffect(() => {
    void refreshAgents();
    void refreshLibrary();
  }, []);

  useEffect(() => {
    void refreshSelectedAgent(selectedAgentSlug);
    setMode("settings");
    setSelectedConversationId(null);
    setSelectedConversation(null);
  }, [selectedAgentSlug]);

  useEffect(() => {
    void refreshConversations();
  }, [selectedAgentSlug, statusFilter]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshAgents();
      void refreshConversations();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [selectedAgentSlug, statusFilter]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void loadConversationDetail(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobDraft(null);
      return;
    }

    if (selectedJobId === "__new__") {
      if (selectedAgentSlug) {
        setJobDraft(blankJobDraft(selectedAgentSlug));
      }
      return;
    }

    const existingJob = jobs.find((job) => job.id === selectedJobId);
    if (existingJob) {
      setJobDraft({ ...existingJob });
    }
  }, [jobs, selectedAgentSlug, selectedJobId]);

  const selectedConversationMeta = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );

  async function saveHeartbeat() {
    if (!selectedAgentSlug) return;
    setSavingHeartbeat(true);
    try {
      await fetch(`/api/agents/personas/${selectedAgentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heartbeat: heartbeatDraft }),
      });
      await refreshAgents();
      await refreshSelectedAgent(selectedAgentSlug);
    } finally {
      setSavingHeartbeat(false);
    }
  }

  async function runHeartbeatNow() {
    if (!selectedAgentSlug) return;
    setRunningHeartbeat(true);
    try {
      const response = await fetch(`/api/agents/personas/${selectedAgentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.sessionId) {
        setSelectedConversationId(data.sessionId as string);
        setMode("conversation");
        await refreshConversations();
      }
    } finally {
      setRunningHeartbeat(false);
    }
  }

  async function saveJob() {
    if (!selectedAgentSlug || !jobDraft) return;
    const isNew = selectedJobId === "__new__" || !selectedJobId;
    const endpoint = isNew
      ? `/api/agents/${selectedAgentSlug}/jobs`
      : `/api/agents/${selectedAgentSlug}/jobs/${selectedJobId}`;

    const method = isNew ? "POST" : "PUT";
    setSavingJob(true);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...jobDraft,
          id: jobDraft.id || undefined,
        }),
      });
      if (!response.ok) return;
      const data = await response.json();
      const nextJob = (data.job || jobDraft) as JobConfig;
      await refreshSelectedAgent(selectedAgentSlug);
      setSelectedJobId(nextJob.id);
    } finally {
      setSavingJob(false);
    }
  }

  async function deleteJob(jobId: string) {
    if (!selectedAgentSlug) return;
    setDeletingJobId(jobId);
    try {
      await fetch(`/api/agents/${selectedAgentSlug}/jobs/${jobId}`, { method: "DELETE" });
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setJobDraft(null);
      }
      await refreshSelectedAgent(selectedAgentSlug);
    } finally {
      setDeletingJobId(null);
    }
  }

  async function toggleJob(job: JobConfig) {
    if (!selectedAgentSlug) return;
    await fetch(`/api/agents/${selectedAgentSlug}/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    await refreshSelectedAgent(selectedAgentSlug);
    await refreshConversations();
  }

  async function runJob(jobId: string) {
    if (!selectedAgentSlug) return;
    setRunningJobId(jobId);
    try {
      const response = await fetch(`/api/agents/${selectedAgentSlug}/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.run?.id) {
        setSelectedConversationId(data.run.id as string);
        setMode("conversation");
        await refreshConversations();
      }
    } finally {
      setRunningJobId(null);
    }
  }

  function startBlankJob() {
    if (!selectedAgentSlug) return;
    setSelectedJobId("__new__");
    setJobDraft(blankJobDraft(selectedAgentSlug));
  }

  function applyLibraryTemplate(template: JobLibraryTemplate) {
    if (!selectedAgentSlug) return;
    setSelectedJobId("__new__");
    setJobDraft({
      ...blankJobDraft(selectedAgentSlug),
      id: template.id,
      name: template.name,
      schedule: template.schedule,
      prompt: template.prompt,
      timeout: template.timeout || 600,
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-[230px] min-w-[230px] flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Jobs</h2>
              <p className="text-[11px] text-muted-foreground">
                Configure recurring work by agent
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              void refreshAgents();
              void refreshConversations();
            }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <button
              onClick={() => setSelectedAgentSlug(null)}
              className={cn(
                "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors",
                selectedAgentSlug === null
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">All agents</span>
            </button>

            {loadingAgents ? (
              <div className="px-3 py-6 text-[12px] text-muted-foreground">Loading agents...</div>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.slug}
                  onClick={() => setSelectedAgentSlug(agent.slug)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors",
                    selectedAgentSlug === agent.slug
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <span className="text-[14px]">{agent.emoji || "🤖"}</span>
                  <span className="truncate">{agent.name}</span>
                  <span
                    className={cn(
                      "ml-auto h-1.5 w-1.5 rounded-full shrink-0",
                      (agent.runningCount || 0) > 0 ? "bg-green-500" : "bg-muted-foreground/30"
                    )}
                  />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex w-[320px] min-w-[320px] flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold">
                {selectedAgent ? `Scheduled runs for ${selectedAgent.name}` : "Scheduled runs"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {selectedAgent
                  ? "Heartbeat and job runs for this agent"
                  : "Heartbeat and job runs across all agents"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "running", "failed"] as StatusFilter[]).map((filter) => (
              <FilterChip
                key={filter}
                active={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "all"
                  ? "Any status"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </FilterChip>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="px-4 py-6 text-[12px] text-muted-foreground">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-muted-foreground">No scheduled runs yet.</div>
          ) : (
            <div>
              {conversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation.id;
                const agent = agents.find((entry) => entry.slug === conversation.agentSlug);

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      setMode("conversation");
                    }}
                    className={cn(
                      "relative flex w-full items-start gap-2 border-b border-border/70 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isSelected ? "bg-accent/65" : "hover:bg-accent/35"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-foreground/60 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mt-0.5 text-[14px]">
                      {agent?.emoji || "🤖"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-medium leading-[1.35]">
                        {conversation.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate">{agent?.name || conversation.agentSlug}</span>
                        <span className="shrink-0">{formatRelative(conversation.startedAt)}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
                        TRIGGER_STYLES[conversation.trigger]
                      )}
                    >
                      {TRIGGER_LABELS[conversation.trigger]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {mode === "conversation" && selectedConversationMeta ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold">{selectedConversationMeta.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {selectedConversationMeta.agentSlug} · {TRIGGER_LABELS[selectedConversationMeta.trigger]} · {selectedConversationMeta.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setMode("settings");
                      setSelectedConversationId(null);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </Button>
                  {selectedConversation?.artifacts?.map((artifact) => (
                    <button
                      key={artifact.path}
                      onClick={() => openArtifactPage(artifact.path)}
                      className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {artifact.label || artifact.path}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedConversationMeta.status === "running" ? (
                <WebTerminal
                  sessionId={selectedConversationMeta.id}
                  displayPrompt={selectedConversationMeta.title}
                  reconnect
                  readOnly
                  themeSurface="page"
                  onClose={() => {
                    void refreshConversations();
                  }}
                />
              ) : selectedConversation ? (
                <ConversationResultView
                  detail={selectedConversation}
                  onOpenArtifact={openArtifactPage}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading conversation...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              {selectedAgent ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedAgent.emoji || "🤖"}</span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{selectedAgent.name} jobs</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Configure heartbeat, recurring jobs, and starter templates
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-[15px] font-semibold">Select an agent</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pick an agent on the left to configure heartbeat and jobs, or browse recent runs in the middle.
                  </p>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-5">
                {selectedAgent ? (
                  <>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-[13px] font-semibold">Heartbeat</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Heartbeat is the agent&apos;s built-in recurring job.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => void runHeartbeatNow()}
                          disabled={runningHeartbeat}
                        >
                          {runningHeartbeat ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          Run now
                        </Button>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <input
                          value={heartbeatDraft}
                          onChange={(event) => setHeartbeatDraft(event.target.value)}
                          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="0 */4 * * *"
                        />
                        <Button
                          size="sm"
                          className="h-10 px-4"
                          onClick={() => void saveHeartbeat()}
                          disabled={savingHeartbeat}
                        >
                          {savingHeartbeat ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {heartbeatDraft ? cronToHuman(heartbeatDraft) : "No heartbeat configured."}
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-[13px] font-semibold">Jobs</h4>
                            <p className="text-[11px] text-muted-foreground">
                              Per-agent recurring prompts
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={startBlankJob}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            New job
                          </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {jobs.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-3 py-6 text-[12px] text-muted-foreground">
                              No jobs yet. Start from scratch or use a library template.
                            </div>
                          ) : (
                            jobs.map((job) => (
                              <div
                                key={job.id}
                                className={cn(
                                  "rounded-xl border px-3 py-3 transition-colors",
                                  selectedJobId === job.id
                                    ? "border-foreground/15 bg-accent/40"
                                    : "border-border bg-background"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => setSelectedJobId(job.id)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full",
                                          job.enabled ? "bg-green-500" : "bg-muted-foreground/30"
                                        )}
                                      />
                                      <span className="truncate text-[12px] font-medium">{job.name}</span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      {cronToHuman(job.schedule)}
                                    </p>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => void runJob(job.id)}
                                      disabled={runningJobId === job.id}
                                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-primary"
                                      title="Run now"
                                    >
                                      {runningJobId === job.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Zap className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => void toggleJob(job)}
                                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                      title={job.enabled ? "Pause" : "Enable"}
                                    >
                                      {job.enabled ? (
                                        <Pause className="h-3.5 w-3.5" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => void deleteJob(job.id)}
                                      disabled={deletingJobId === job.id}
                                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-[13px] font-semibold">
                              {selectedJobId === "__new__" ? "New job" : selectedJobId ? "Job editor" : "Starter library"}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedJobId
                                ? "Edit the selected job for this agent."
                                : "Pick a starter job to prefill a new recurring workflow."}
                            </p>
                          </div>
                          {selectedJobId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => {
                                setSelectedJobId(null);
                                setJobDraft(null);
                              }}
                            >
                              Done
                            </Button>
                          )}
                        </div>

                        {jobDraft ? (
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Job name</label>
                              <input
                                value={jobDraft.name}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current ? { ...current, name: event.target.value } : current
                                  )
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Weekly strategy digest"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Job id</label>
                              <input
                                value={jobDraft.id}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current ? { ...current, id: event.target.value } : current
                                  )
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="weekly-strategy-digest"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Schedule</label>
                              <input
                                value={jobDraft.schedule}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current ? { ...current, schedule: event.target.value } : current
                                  )
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="0 9 * * 1"
                              />
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {jobDraft.schedule ? cronToHuman(jobDraft.schedule) : "No schedule set."}
                              </p>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Prompt</label>
                              <textarea
                                value={jobDraft.prompt}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current ? { ...current, prompt: event.target.value } : current
                                  )
                                }
                                rows={10}
                                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                placeholder="What should this job do?"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                className="h-9 px-4"
                                onClick={() => void saveJob()}
                                disabled={
                                  savingJob ||
                                  !jobDraft.name.trim() ||
                                  !jobDraft.id.trim() ||
                                  !jobDraft.prompt.trim()
                                }
                              >
                                {savingJob ? "Saving..." : "Save job"}
                              </Button>
                              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={jobDraft.enabled}
                                  onChange={(event) =>
                                    setJobDraft((current) =>
                                      current ? { ...current, enabled: event.target.checked } : current
                                    )
                                  }
                                />
                                Enabled
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {libraryTemplates.map((template) => (
                              <div
                                key={template.id}
                                className="rounded-xl border border-border bg-background px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-medium">{template.name}</div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {template.description}
                                    </p>
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                      Suggested schedule: {cronToHuman(template.schedule)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 text-xs"
                                    onClick={() => applyLibraryTemplate(template)}
                                  >
                                    Use
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                    <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <h4 className="mt-3 text-[14px] font-semibold">Select an agent to configure jobs</h4>
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      The middle column stays focused on runs and history, while this main panel becomes the job and heartbeat control center for the selected agent.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
