"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import type { TreeNode } from "@/types";
import type { ConversationDetail, ConversationMeta } from "@/types/conversations";
import type { JobConfig } from "@/types/jobs";

type TriggerFilter = "all" | "manual" | "job" | "heartbeat";
type StatusFilter = "all" | "running" | "failed";
type MainPanelMode = "composer" | "conversation" | "settings";
type SettingsTarget = "directory" | "__new__" | string | null;

interface AgentSummary {
  name: string;
  slug: string;
  emoji: string;
  role: string;
  active: boolean;
  heartbeat?: string;
  runningCount?: number;
  department?: string;
  type?: string;
  workspace?: string;
  body?: string;
}

interface PersonaResponse {
  persona: AgentSummary;
}

interface NewAgentDraft {
  name: string;
  slug: string;
  emoji: string;
  role: string;
  heartbeat: string;
  department: string;
  type: string;
  workspace: string;
  body: string;
  active: boolean;
}

const GENERAL_AGENT: AgentSummary = {
  name: "General",
  slug: "general",
  emoji: "🤖",
  role: "Manual Cabinet assistant",
  active: true,
  runningCount: 0,
  department: "general",
  type: "specialist",
  workspace: "/",
  body: "",
};

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

const AGENT_EMOJI_OPTIONS = [
  "🤖",
  "👑",
  "📝",
  "📣",
  "📊",
  "🎨",
  "🚀",
  "🧠",
  "⚡",
  "🔧",
  "💼",
  "🔍",
];

const DEFAULT_NEW_AGENT: NewAgentDraft = {
  name: "",
  slug: "",
  emoji: "🤖",
  role: "",
  heartbeat: "0 */4 * * *",
  department: "general",
  type: "specialist",
  workspace: "workspace",
  body: "",
  active: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function flattenTree(nodes: TreeNode[]): { path: string; title: string }[] {
  const pages: { path: string; title: string }[] = [];

  for (const node of nodes) {
    if (node.type !== "website") {
      pages.push({
        path: node.path,
        title: node.frontmatter?.title || node.name,
      });
    }
    if (node.children) {
      pages.push(...flattenTree(node.children));
    }
  }

  return pages;
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

function triggerFromFilter(filter: TriggerFilter): ConversationMeta["trigger"] | undefined {
  if (filter === "all") return undefined;
  return filter;
}

function statusFromFilter(filter: StatusFilter): ConversationMeta["status"] | undefined {
  if (filter === "all") return undefined;
  return filter;
}

function makePageContextLabel(path: string, pages: { path: string; title: string }[]): string {
  return pages.find((page) => page.path === path)?.title || path;
}

function TriggerChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

export function AgentsWorkspace({
  selectedAgentSlug,
  selectedScope = "all",
}: {
  selectedAgentSlug?: string | null;
  selectedScope?: "all" | "agent";
}) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [mode, setMode] = useState<MainPanelMode>("composer");
  const [activeAgentSlug, setActiveAgentSlug] = useState<string | null>(
    selectedScope === "agent" ? selectedAgentSlug || null : null
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget>(null);
  const [settingsPersona, setSettingsPersona] = useState<AgentSummary | null>(null);
  const [settingsBody, setSettingsBody] = useState("");
  const [settingsJobs, setSettingsJobs] = useState<JobConfig[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDraft, setJobDraft] = useState<JobConfig | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [composerInput, setComposerInput] = useState("");
  const [mentionedPaths, setMentionedPaths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [newAgentDraft, setNewAgentDraft] = useState<NewAgentDraft>(DEFAULT_NEW_AGENT);
  const treeNodes = useTreeStore((state) => state.nodes);
  const selectPage = useTreeStore((state) => state.selectPage);
  const setSection = useAppStore((state) => state.setSection);

  const allPages = flattenTree(treeNodes);
  const settingsAgentSlug =
    settingsTarget && settingsTarget !== "directory" && settingsTarget !== "__new__"
      ? settingsTarget
      : null;
  const filteredMentions = allPages.filter(
    (page) =>
      page.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  async function refreshAgents() {
    const response = await fetch("/api/agents/personas");
    if (!response.ok) return;
    const data = await response.json();
    const personas = (data.personas || []) as AgentSummary[];
    const generalRunning =
      conversations.filter(
        (conversation) =>
          conversation.agentSlug === "general" && conversation.status === "running"
      ).length || 0;

    const sorted = [
      { ...GENERAL_AGENT, runningCount: generalRunning },
      ...personas.sort((a, b) => {
        if (a.slug === "editor") return -1;
        if (b.slug === "editor") return 1;
        return a.name.localeCompare(b.name);
      }),
    ];
    setAgents(sorted);
  }

  async function refreshConversations() {
    setConversationsLoading(true);
    const params = new URLSearchParams();
    if (activeAgentSlug) params.set("agent", activeAgentSlug);
    const trigger = triggerFromFilter(triggerFilter);
    const status = statusFromFilter(statusFilter);
    if (trigger) params.set("trigger", trigger);
    if (status) params.set("status", status);
    params.set("limit", "200");

    const response = await fetch(`/api/agents/conversations?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setConversations((data.conversations || []) as ConversationMeta[]);
    }
    setConversationsLoading(false);
  }

  async function refreshSettings(agentSlug: string) {
    if (agentSlug === "general") {
      setSettingsPersona(GENERAL_AGENT);
      setSettingsBody("");
      setSettingsJobs([]);
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
      setSettingsPersona(data.persona);
      setSettingsBody(data.persona.body || "");
    }

    if (jobsResponse.ok) {
      const data = await jobsResponse.json();
      setSettingsJobs((data.jobs || []) as JobConfig[]);
    } else {
      setSettingsJobs([]);
    }
    setSelectedJobId(null);
    setJobDraft(null);
  }

  async function refreshSelectedConversation(conversationId: string) {
    const response = await fetch(`/api/agents/conversations/${conversationId}`);
    if (!response.ok) return;
    const detail = (await response.json()) as ConversationDetail;
    setSelectedConversation(detail);
  }

  useEffect(() => {
    void refreshConversations();
  }, [activeAgentSlug, triggerFilter, statusFilter]);

  useEffect(() => {
    void refreshAgents();
  }, [conversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshConversations();
      void refreshAgents();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeAgentSlug, triggerFilter, statusFilter, conversations]);

  useEffect(() => {
    setActiveAgentSlug(selectedScope === "agent" ? selectedAgentSlug || null : null);
    setSelectedConversationId(null);
    setSelectedConversation(null);
    setSettingsTarget(null);
    setMode("composer");
  }, [selectedAgentSlug, selectedScope]);

  useEffect(() => {
    if (mode === "settings" && settingsAgentSlug) {
      void refreshSettings(settingsAgentSlug);
    }
  }, [mode, settingsAgentSlug]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return;
    }
    const current = conversations.find((conversation) => conversation.id === selectedConversationId);
    if (current && current.status !== "running") {
      void refreshSelectedConversation(selectedConversationId);
    }
  }, [selectedConversationId, conversations]);

  function selectAgent(agentSlug: string | null, nextMode: MainPanelMode = "composer") {
    setActiveAgentSlug(agentSlug);
    setSelectedConversationId(null);
    setSelectedConversation(null);
    setSettingsTarget(null);
    setMode(nextMode);
    if (agentSlug) {
      setSection({ type: "agent", slug: agentSlug });
    } else {
      setSection({ type: "agents" });
    }
  }

  function openAgentDirectory() {
    setMode("settings");
    setSettingsTarget("directory");
    setSelectedJobId(null);
    setJobDraft(null);
  }

  function openAgentSettings(agentSlug: string) {
    setMode("settings");
    setSettingsTarget(agentSlug);
    setSelectedJobId(null);
    setJobDraft(null);
  }

  function startNewAgentDraft() {
    setMode("settings");
    setSettingsTarget("__new__");
    setSelectedJobId(null);
    setJobDraft(null);
    setNewAgentDraft(DEFAULT_NEW_AGENT);
  }

  function handleComposerInput(value: string, cursorPosition: number) {
    setComposerInput(value);
    const textBefore = value.slice(0, cursorPosition);
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex === -1) {
      setShowMentions(false);
      return;
    }

    const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : " ";
    if (charBefore !== " " && charBefore !== "\n" && atIndex !== 0) {
      setShowMentions(false);
      return;
    }

    const query = textBefore.slice(atIndex + 1);
    if (query.includes(" ") || query.includes("\n")) {
      setShowMentions(false);
      return;
    }

    setMentionStartPos(atIndex);
    setMentionQuery(query);
    setMentionIndex(0);
    setShowMentions(true);
  }

  function insertMention(path: string, title: string) {
    const before = composerInput.slice(0, mentionStartPos);
    const after = composerInput.slice(mentionStartPos + mentionQuery.length + 1);
    setComposerInput(`${before}@${title} ${after}`);
    setMentionedPaths((current) =>
      current.includes(path) ? current : [...current, path]
    );
    setShowMentions(false);
  }

  async function submitConversation() {
    if (!composerInput.trim()) return;
    if (!activeAgentSlug) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: activeAgentSlug,
          userMessage: composerInput.trim(),
          mentionedPaths,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const conversation = data.conversation as ConversationMeta;
      setComposerInput("");
      setMentionedPaths([]);
      setSelectedConversationId(conversation.id);
      setMode("conversation");
      await refreshConversations();
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAgentSettings() {
    if (!settingsAgentSlug || settingsAgentSlug === "general" || !settingsPersona) return;
    setSavingSettings(true);
    try {
      await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: settingsPersona.role,
          department: settingsPersona.department,
          type: settingsPersona.type,
          heartbeat: settingsPersona.heartbeat,
          workspace: settingsPersona.workspace,
          body: settingsBody,
        }),
      });
      await refreshAgents();
      await refreshSettings(settingsAgentSlug);
    } finally {
      setSavingSettings(false);
    }
  }

  async function toggleAgentActive() {
    if (!settingsAgentSlug || settingsAgentSlug === "general") return;
    await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    await refreshAgents();
    await refreshSettings(settingsAgentSlug);
  }

  async function runHeartbeatNow() {
    if (!settingsAgentSlug || settingsAgentSlug === "general") return;
    const response = await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.sessionId) {
      setActiveAgentSlug(settingsAgentSlug);
      setSection({ type: "agent", slug: settingsAgentSlug });
      setSettingsTarget(null);
      setSelectedConversationId(data.sessionId as string);
      setMode("conversation");
      await refreshConversations();
    }
  }

  function startNewJobDraft() {
    setSelectedJobId("__new__");
    setJobDraft({
      id: "",
      name: "",
      enabled: true,
      schedule: "0 9 * * 1-5",
      provider: "claude-code",
      agentSlug: settingsAgentSlug || "",
      prompt: "",
      timeout: 600,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function openJob(jobId: string) {
    const job = settingsJobs.find((entry) => entry.id === jobId);
    if (!job) return;
    setSelectedJobId(jobId);
    setJobDraft({ ...job });
  }

  async function saveJob() {
    if (!settingsAgentSlug || !jobDraft) return;
    const isNew = selectedJobId === "__new__";
    const endpoint = isNew
      ? `/api/agents/${settingsAgentSlug}/jobs`
      : `/api/agents/${settingsAgentSlug}/jobs/${selectedJobId}`;
    const method = isNew ? "POST" : "PUT";
    const body = isNew
      ? jobDraft
      : {
          name: jobDraft.name,
          schedule: jobDraft.schedule,
          prompt: jobDraft.prompt,
          timeout: jobDraft.timeout,
          enabled: jobDraft.enabled,
        };

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    await refreshSettings(settingsAgentSlug);
  }

  async function deleteJob(jobId: string) {
    if (!settingsAgentSlug) return;
    await fetch(`/api/agents/${settingsAgentSlug}/jobs/${jobId}`, {
      method: "DELETE",
    });
    setSelectedJobId(null);
    setJobDraft(null);
    await refreshSettings(settingsAgentSlug);
  }

  async function runJob(jobId: string) {
    if (!settingsAgentSlug) return;
    const response = await fetch(`/api/agents/${settingsAgentSlug}/jobs/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.run?.id) {
      setActiveAgentSlug(settingsAgentSlug);
      setSection({ type: "agent", slug: settingsAgentSlug });
      setSettingsTarget(null);
      setSelectedConversationId(data.run.id as string);
      setMode("conversation");
      await refreshConversations();
    }
  }

  async function createAgent() {
    const slug = slugify(newAgentDraft.slug || newAgentDraft.name);
    if (!newAgentDraft.name.trim() || !newAgentDraft.role.trim() || !slug) return;

    setCreatingAgent(true);
    try {
      const response = await fetch("/api/agents/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: newAgentDraft.name.trim(),
          role: newAgentDraft.role.trim(),
          emoji: newAgentDraft.emoji,
          department: newAgentDraft.department,
          type: newAgentDraft.type,
          heartbeat: newAgentDraft.heartbeat,
          workspace: newAgentDraft.workspace || "workspace",
          provider: "claude-code",
          budget: 100,
          active: newAgentDraft.active,
          workdir: "/data",
          focus: [],
          tags: [newAgentDraft.department],
          channels:
            newAgentDraft.department === "general"
              ? ["general"]
              : [newAgentDraft.department, "general"],
          body:
            newAgentDraft.body.trim() ||
            `You are ${newAgentDraft.name.trim()}. ${newAgentDraft.role.trim()}`,
        }),
      });

      if (!response.ok) return;
      await refreshAgents();
      setSettingsTarget(slug);
      setNewAgentDraft(DEFAULT_NEW_AGENT);
      await refreshSettings(slug);
    } finally {
      setCreatingAgent(false);
    }
  }

  async function deleteAgent() {
    if (!settingsAgentSlug || settingsAgentSlug === "general") return;
    setDeletingAgent(true);
    try {
      const response = await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
        method: "DELETE",
      });
      if (!response.ok) return;
      if (activeAgentSlug === settingsAgentSlug) {
        setActiveAgentSlug(null);
        setSection({ type: "agents" });
      }
      setSelectedConversationId(null);
      setSelectedConversation(null);
      setSettingsTarget("directory");
      setSettingsPersona(null);
      setSettingsBody("");
      setSettingsJobs([]);
      setSelectedJobId(null);
      setJobDraft(null);
      await refreshAgents();
      await refreshConversations();
    } finally {
      setDeletingAgent(false);
    }
  }

  const selectedConversationMeta = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );
  const activeAgent = activeAgentSlug
    ? agents.find((agent) => agent.slug === activeAgentSlug) || null
    : null;
  const settingsAgent = settingsAgentSlug
    ? agents.find((agent) => agent.slug === settingsAgentSlug) || null
    : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[340px] min-w-[340px] border-r border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold">
                {activeAgent ? activeAgent.name : "All agents"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {activeAgent
                  ? `Recent runs for ${activeAgent.name}`
                  : "Recent runs across your whole team"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  if (mode === "settings") {
                    setMode("composer");
                    setSettingsTarget(null);
                    setSelectedJobId(null);
                    setJobDraft(null);
                    return;
                  }
                  if (activeAgentSlug) {
                    openAgentSettings(activeAgentSlug);
                  } else {
                    openAgentDirectory();
                  }
                }}
              >
                <Settings className="h-3.5 w-3.5" />
                {mode === "settings"
                  ? "Done"
                  : activeAgentSlug
                    ? "Settings"
                    : "Manage"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  void refreshAgents();
                  void refreshConversations();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "manual", "job", "heartbeat"] as TriggerFilter[]).map((filter) => (
              <TriggerChip
                key={filter}
                active={triggerFilter === filter}
                onClick={() => setTriggerFilter(filter)}
              >
                {filter === "all" ? "All" : filter === "job" ? "Jobs" : filter === "heartbeat" ? "Heartbeat" : "Manual"}
              </TriggerChip>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["all", "running", "failed"] as StatusFilter[]).map((filter) => (
              <TriggerChip
                key={filter}
                active={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "all" ? "Any status" : filter[0].toUpperCase() + filter.slice(1)}
              </TriggerChip>
            ))}
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-115px)]">
          <div className="space-y-1 p-2">
            {conversationsLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-[12px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-8 text-[12px] text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              conversations.map((conversation) => {
                const agent = agents.find((entry) => entry.slug === conversation.agentSlug);
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      setMode("conversation");
                    }}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      selectedConversationId === conversation.id
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">
                        {conversation.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : conversation.status === "failed" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-medium text-foreground">
                            {conversation.title}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px]",
                              TRIGGER_STYLES[conversation.trigger]
                            )}
                          >
                            {TRIGGER_LABELS[conversation.trigger]}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {agent?.name || conversation.agentSlug} · {formatRelative(conversation.startedAt)}
                        </p>
                        {conversation.summary ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
                            {conversation.summary}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "conversation" && selectedConversationMeta ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {agents.find((agent) => agent.slug === selectedConversationMeta.agentSlug)?.emoji || "🤖"}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold">{selectedConversationMeta.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedConversationMeta.agentSlug} · {TRIGGER_LABELS[selectedConversationMeta.trigger]} ·{" "}
                    {selectedConversationMeta.status}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => openAgentSettings(selectedConversationMeta.agentSlug)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Button>
                  {selectedConversation?.artifacts?.map((artifact) => (
                    <button
                      key={artifact.path}
                      onClick={() => {
                        selectPage(artifact.path);
                        setSection({ type: "page" });
                      }}
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
                  reconnect
                  onClose={() => {
                    void refreshConversations();
                  }}
                />
              ) : selectedConversation ? (
                <ScrollArea className="h-full bg-[#0a0a0a]">
                  <pre className="min-h-full whitespace-pre-wrap p-5 font-mono text-[12px] leading-relaxed text-neutral-200">
                    {selectedConversation.transcript || "No transcript captured."}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading conversation...
                </div>
              )}
            </div>
          </div>
        ) : mode === "settings" ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              {settingsTarget === "directory" || !settingsTarget ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">Agent settings</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Big-picture management for your team. Add agents, remove agents, or open detailed settings.
                    </p>
                  </div>
                  <Button size="sm" className="h-8 gap-1 text-xs" onClick={startNewAgentDraft}>
                    <Plus className="h-3.5 w-3.5" />
                    Add agent
                  </Button>
                </div>
              ) : settingsTarget === "__new__" ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">Create agent</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Add a new agent to the team and define its default heartbeat and instructions.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={openAgentDirectory}>
                    Back to agents
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{settingsAgent?.emoji || "🤖"}</span>
                    <div>
                      <h3 className="text-[15px] font-semibold">
                        {settingsAgent?.name || "Agent settings"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Definition, heartbeat, and jobs
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {settingsAgentSlug ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => selectAgent(settingsAgentSlug, "composer")}
                      >
                        Open conversations
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={openAgentDirectory}
                    >
                      Back to agents
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-6 p-5">
                {settingsTarget === "directory" || !settingsTarget ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {agents.map((agent) => (
                      <div
                        key={agent.slug}
                        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{agent.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="truncate text-[14px] font-semibold">{agent.name}</h4>
                              <span
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[10px]",
                                  agent.active
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {agent.active ? "Active" : "Paused"}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                              {agent.role}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-1">
                                {agent.runningCount || 0} running
                              </span>
                              {agent.heartbeat ? (
                                <span className="rounded-full bg-muted px-2 py-1">
                                  {agent.slug === "general" ? "Manual only" : agent.heartbeat}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs"
                            onClick={() => selectAgent(agent.slug, "composer")}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 flex-1 gap-1 text-xs"
                            onClick={() => openAgentSettings(agent.slug)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Settings
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : settingsTarget === "__new__" ? (
                  <div className="mx-auto w-full max-w-3xl space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Name</span>
                          <input
                            value={newAgentDraft.name}
                            onChange={(event) =>
                              setNewAgentDraft((current) => {
                                const nextName = event.target.value;
                                const currentDerivedSlug = slugify(current.name);
                                return {
                                  ...current,
                                  name: nextName,
                                  slug:
                                    !current.slug || current.slug === currentDerivedSlug
                                      ? slugify(nextName)
                                      : current.slug,
                                };
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                            placeholder="Editor"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Slug</span>
                          <input
                            value={newAgentDraft.slug}
                            onChange={(event) =>
                              setNewAgentDraft({
                                ...newAgentDraft,
                                slug: slugify(event.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                            placeholder="editor"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Role</span>
                          <input
                            value={newAgentDraft.role}
                            onChange={(event) =>
                              setNewAgentDraft({ ...newAgentDraft, role: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                            placeholder="Product writing agent"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Heartbeat</span>
                          <input
                            value={newAgentDraft.heartbeat}
                            onChange={(event) =>
                              setNewAgentDraft({
                                ...newAgentDraft,
                                heartbeat: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Department</span>
                          <input
                            value={newAgentDraft.department}
                            onChange={(event) =>
                              setNewAgentDraft({
                                ...newAgentDraft,
                                department: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Type</span>
                          <input
                            value={newAgentDraft.type}
                            onChange={(event) =>
                              setNewAgentDraft({ ...newAgentDraft, type: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                        <label className="col-span-2 space-y-1 text-[11px] text-muted-foreground">
                          <span>Workspace</span>
                          <input
                            value={newAgentDraft.workspace}
                            onChange={(event) =>
                              setNewAgentDraft({
                                ...newAgentDraft,
                                workspace: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                            placeholder="workspace"
                          />
                        </label>
                        <div className="col-span-2 space-y-2 text-[11px] text-muted-foreground">
                          <span>Avatar</span>
                          <div className="flex flex-wrap gap-2">
                            {AGENT_EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() =>
                                  setNewAgentDraft({
                                    ...newAgentDraft,
                                    emoji,
                                  })
                                }
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-lg transition-colors",
                                  newAgentDraft.emoji === emoji
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:bg-accent/40"
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="col-span-2 space-y-1 text-[11px] text-muted-foreground">
                          <span>Instructions</span>
                          <textarea
                            value={newAgentDraft.body}
                            onChange={(event) =>
                              setNewAgentDraft({ ...newAgentDraft, body: event.target.value })
                            }
                            className="min-h-[220px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                            placeholder="Define how this agent should work inside Cabinet and the KB."
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={newAgentDraft.active}
                            onChange={(event) =>
                              setNewAgentDraft({
                                ...newAgentDraft,
                                active: event.target.checked,
                              })
                            }
                          />
                          Start active
                        </label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={openAgentDirectory}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-8 text-xs" onClick={createAgent} disabled={creatingAgent}>
                            {creatingAgent ? "Creating..." : "Create agent"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : settingsAgentSlug === "general" ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
                      General is manual-only in this MVP. Use it as the default place for ad-hoc conversations, and manage the rest of the team from the agent directory.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => selectAgent("general", "composer")}
                    >
                      Open General conversations
                    </Button>
                  </div>
                ) : settingsPersona ? (
                  <>
                    <div className="rounded-xl border border-border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-[13px] font-semibold">Agent definition</h4>
                          <p className="text-[11px] text-muted-foreground">Core identity and heartbeat settings</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={runHeartbeatNow}>
                            <Zap className="h-3.5 w-3.5" />
                            Run heartbeat
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={toggleAgentActive}>
                            {settingsPersona.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {settingsPersona.active ? "Pause" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-destructive"
                            onClick={deleteAgent}
                            disabled={deletingAgent}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingAgent ? "Removing..." : "Remove agent"}
                          </Button>
                          <Button size="sm" className="h-8 text-xs" onClick={saveAgentSettings} disabled={savingSettings}>
                            {savingSettings ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Role</span>
                          <input
                            value={settingsPersona.role || ""}
                            onChange={(event) =>
                              setSettingsPersona({ ...settingsPersona, role: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Heartbeat</span>
                          <input
                            value={settingsPersona.heartbeat || ""}
                            onChange={(event) =>
                              setSettingsPersona({ ...settingsPersona, heartbeat: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Department</span>
                          <input
                            value={settingsPersona.department || ""}
                            onChange={(event) =>
                              setSettingsPersona({ ...settingsPersona, department: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-muted-foreground">
                          <span>Type</span>
                          <input
                            value={settingsPersona.type || ""}
                            onChange={(event) =>
                              setSettingsPersona({ ...settingsPersona, type: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                        <label className="col-span-2 space-y-1 text-[11px] text-muted-foreground">
                          <span>Workspace</span>
                          <input
                            value={settingsPersona.workspace || ""}
                            onChange={(event) =>
                              setSettingsPersona({ ...settingsPersona, workspace: event.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                          />
                        </label>
                        <label className="col-span-2 space-y-1 text-[11px] text-muted-foreground">
                          <span>Instructions</span>
                          <textarea
                            value={settingsBody}
                            onChange={(event) => setSettingsBody(event.target.value)}
                            className="min-h-[220px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4">
                      <div className="rounded-xl border border-border">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                          <div>
                            <h4 className="text-[13px] font-semibold">Jobs</h4>
                            <p className="text-[11px] text-muted-foreground">Heartbeat stays above, recurring jobs live here</p>
                          </div>
                          <Button size="sm" className="h-8 gap-1 text-xs" onClick={startNewJobDraft}>
                            <Plus className="h-3.5 w-3.5" />
                            Add job
                          </Button>
                        </div>
                        <div className="space-y-1 p-2">
                          {settingsJobs.length === 0 ? (
                            <div className="px-2 py-6 text-[12px] text-muted-foreground">No jobs yet.</div>
                          ) : (
                            settingsJobs.map((job) => (
                              <button
                                key={job.id}
                                onClick={() => openJob(job.id)}
                                className={cn(
                                  "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                                  selectedJobId === job.id
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-border hover:bg-accent/40"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate text-[12px] font-medium">{job.name}</span>
                                  <span
                                    className={cn(
                                      "ml-auto rounded-full px-1.5 py-0.5 text-[10px]",
                                      job.enabled
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {job.enabled ? "On" : "Off"}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-[11px] text-muted-foreground">{job.schedule}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        {jobDraft ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-[13px] font-semibold">
                                  {selectedJobId === "__new__" ? "New job" : "Job settings"}
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                  Prompts relevant to the agent that run on a schedule
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {selectedJobId && selectedJobId !== "__new__" ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs"
                                      onClick={() => runJob(selectedJobId)}
                                    >
                                      <Play className="h-3.5 w-3.5" />
                                      Run
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1 text-xs text-destructive"
                                      onClick={() => deleteJob(selectedJobId)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </Button>
                                  </>
                                ) : null}
                                <Button size="sm" className="h-8 text-xs" onClick={saveJob}>
                                  Save job
                                </Button>
                              </div>
                            </div>
                            <label className="space-y-1 text-[11px] text-muted-foreground">
                              <span>Name</span>
                              <input
                                value={jobDraft.name}
                                onChange={(event) => setJobDraft({ ...jobDraft, name: event.target.value })}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-muted-foreground">
                              <span>Schedule</span>
                              <input
                                value={jobDraft.schedule}
                                onChange={(event) => setJobDraft({ ...jobDraft, schedule: event.target.value })}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-muted-foreground">
                              <span>Timeout (seconds)</span>
                              <input
                                type="number"
                                value={jobDraft.timeout || 600}
                                onChange={(event) =>
                                  setJobDraft({
                                    ...jobDraft,
                                    timeout: parseInt(event.target.value || "600", 10),
                                  })
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-muted-foreground">
                              <span>Prompt</span>
                              <textarea
                                value={jobDraft.prompt}
                                onChange={(event) => setJobDraft({ ...jobDraft, prompt: event.target.value })}
                                className="min-h-[220px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[280px] items-center justify-center text-[12px] text-muted-foreground">
                            Select a job to edit its settings, or create a new one.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">
                    {activeAgentSlug
                      ? `Start a new conversation with ${activeAgent?.name || activeAgentSlug}`
                      : "Choose an agent to start a conversation"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Use @mentions to bring KB files into context, just like the Claude editor.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    if (activeAgentSlug) {
                      openAgentSettings(activeAgentSlug);
                    } else {
                      openAgentDirectory();
                    }
                  }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  {activeAgentSlug ? "Settings" : "Manage agents"}
                </Button>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center px-8 py-10">
              {!activeAgentSlug ? (
                <div className="mx-auto max-w-xl text-center">
                  <Bot className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-[14px] font-medium">Pick an agent from the left rail</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    The center column already shows the team timeline. Choose one agent on the left to start a focused session, or open Manage agents to add and remove teammates.
                  </p>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-3xl">
                  <div className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <textarea
                      value={composerInput}
                      onChange={(event) =>
                        handleComposerInput(
                          event.target.value,
                          event.target.selectionStart || event.target.value.length
                        )
                      }
                      onKeyDown={(event) => {
                        if (showMentions && filteredMentions.length > 0) {
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setMentionIndex((current) => (current + 1) % filteredMentions.length);
                          } else if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setMentionIndex((current) =>
                              current === 0 ? filteredMentions.length - 1 : current - 1
                            );
                          } else if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            const page = filteredMentions[mentionIndex];
                            if (page) insertMention(page.path, page.title);
                          } else if (event.key === "Escape") {
                            setShowMentions(false);
                          }
                          return;
                        }

                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          void submitConversation();
                        }
                      }}
                      placeholder={`Ask ${agents.find((agent) => agent.slug === activeAgentSlug)?.name || activeAgentSlug} to work on something...`}
                      className="min-h-[180px] w-full resize-none bg-transparent text-[14px] outline-none"
                    />

                    {mentionedPaths.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mentionedPaths.map((path) => (
                          <button
                            key={path}
                            onClick={() =>
                              setMentionedPaths((current) => current.filter((entry) => entry !== path))
                            }
                            className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            @{makePageContextLabel(path, allPages)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {showMentions && filteredMentions.length > 0 ? (
                      <div className="absolute left-4 right-4 top-[calc(100%-12px)] z-10 rounded-xl border border-border bg-popover p-1 shadow-lg">
                        {filteredMentions.slice(0, 6).map((page, index) => (
                          <button
                            key={page.path}
                            onClick={() => insertMention(page.path, page.title)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px]",
                              index === mentionIndex
                                ? "bg-accent text-foreground"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                          >
                            <span className="truncate">{page.title}</span>
                            <span className="ml-3 truncate text-[11px] text-muted-foreground">
                              {page.path}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        Tip: type <span className="font-mono">@</span> to mention KB files. Press Cmd/Ctrl + Enter to send.
                      </p>
                      <Button className="gap-2" onClick={() => void submitConversation()} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Start conversation
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
