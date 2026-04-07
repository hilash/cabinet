"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Copy,
  Clock3,
  Crown,
  HeartPulse,
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
  Library,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { ConversationResultView } from "@/components/agents/conversation-result-view";
import { cronToHuman } from "@/lib/agents/cron-utils";
import { SchedulePicker } from "@/components/mission-control/schedule-picker";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import type { JobLibraryTemplate } from "@/lib/jobs/job-library";
import type { TreeNode } from "@/types";
import type { ConversationDetail, ConversationMeta } from "@/types/conversations";
import type { JobConfig } from "@/types/jobs";
import type { AgentListItem } from "@/types/agents";

type TriggerFilter = "all" | "manual" | "job" | "heartbeat";
type StatusFilter = "all" | "running" | "completed" | "failed";
type MainPanelMode = "composer" | "conversation" | "settings";
type SettingsTarget = "directory" | string | null;

interface PersonaResponse {
  persona: AgentListItem;
}

interface AgentTemplate {
  slug: string;
  name: string;
  emoji: string;
  type: string;
  department: string;
  role: string;
  description: string;
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

const GENERAL_AGENT: AgentListItem = {
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

const TASK_CARD_TRIGGER_STYLES: Record<ConversationMeta["trigger"], string> = {
  manual: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20",
  job: "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20",
  heartbeat: "bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/20",
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

function startCase(value: string | undefined, fallback = "Not set"): string {
  if (!value) return fallback;
  const words = value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);
  if (words.length === 0) return fallback;
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function rankAgentType(type?: string): number {
  if (type === "lead") return 0;
  if (type === "specialist") return 1;
  if (type === "support") return 2;
  return 3;
}

function sortOrgAgents(a: AgentListItem, b: AgentListItem): number {
  const typeRank = rankAgentType(a.type) - rankAgentType(b.type);
  if (typeRank !== 0) return typeRank;
  if ((b.runningCount || 0) !== (a.runningCount || 0)) {
    return (b.runningCount || 0) - (a.runningCount || 0);
  }
  if ((b.active ? 1 : 0) !== (a.active ? 1 : 0)) {
    return (b.active ? 1 : 0) - (a.active ? 1 : 0);
  }
  return a.name.localeCompare(b.name);
}

function findChiefAgent(agents: AgentListItem[]): AgentListItem | null {
  const bySlug = agents.find((agent) => agent.slug.toLowerCase() === "ceo");
  if (bySlug) return bySlug;

  const byName = agents.find((agent) => agent.name.trim().toLowerCase() === "ceo");
  if (byName) return byName;

  const byRole = agents.find((agent) =>
    agent.role.toLowerCase().includes("chief executive")
  );
  if (byRole) return byRole;

  return agents.find((agent) => agent.type === "lead") || null;
}

function isAgentWorking(agent: Pick<AgentListItem, "active" | "runningCount">): boolean {
  return !!agent.active || (agent.runningCount || 0) > 0;
}

function ActivityBeacon({
  active,
  title = "Working",
}: {
  active: boolean;
  title?: string;
}) {
  if (!active) return null;

  return (
    <span
      title={title}
      aria-label={title}
      className="relative inline-flex h-3.5 w-3.5 shrink-0"
    >
      <span className="absolute -inset-1 rounded-full border border-emerald-400/25 animate-ping [animation-duration:2.4s]" />
      <span className="absolute inset-0 rounded-full border border-emerald-400/40" />
      <span className="absolute inset-[3px] rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
    </span>
  );
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useHorizontalResize(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragStateRef.current) return;
      const nextWidth =
        dragStateRef.current.startWidth + (event.clientX - dragStateRef.current.startX);
      setWidth(clamp(nextWidth, minWidth, maxWidth));
    }

    function handlePointerUp() {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [maxWidth, minWidth]);

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    dragStateRef.current = { startX: event.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return { width, startResize };
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

function formatTimestamp(iso?: string): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function triggerFromFilter(filter: TriggerFilter): ConversationMeta["trigger"] | undefined {
  if (filter === "all") return undefined;
  return filter;
}

function statusFromFilter(filter: StatusFilter): ConversationMeta["status"] | undefined {
  if (filter === "all") return undefined;
  return filter;
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
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

function TriggerIcon({
  trigger,
  className,
}: {
  trigger: ConversationMeta["trigger"];
  className?: string;
}) {
  if (trigger === "manual") {
    return <Bot className={cn("h-3 w-3", className)} />;
  }

  if (trigger === "job") {
    return <Clock3 className={cn("h-3 w-3", className)} />;
  }

  return <HeartPulse className={cn("h-3 w-3", className)} />;
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

export function AgentsWorkspace({
  selectedAgentSlug,
  selectedScope = "all",
}: {
  selectedAgentSlug?: string | null;
  selectedScope?: "all" | "agent";
}) {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const [mode, setMode] = useState<MainPanelMode>("composer");
  const [activeAgentSlug, setActiveAgentSlug] = useState<string | null>(
    selectedScope === "agent" ? selectedAgentSlug || null : null
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget>(null);
  const [settingsPersona, setSettingsPersona] = useState<AgentListItem | null>(null);
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
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [newAgentDraft, setNewAgentDraft] = useState<NewAgentDraft>(DEFAULT_NEW_AGENT);
  const [settingsBodyHtml, setSettingsBodyHtml] = useState("");
  const [settingsEditorDraft, setSettingsEditorDraft] = useState<AgentListItem | null>(null);
  const [settingsEditorBody, setSettingsEditorBody] = useState("");
  const [settingsEditorBodyHtml, setSettingsEditorBodyHtml] = useState("");
  const [settingsBodyMode, setSettingsBodyMode] = useState<"write" | "preview">("preview");
  const [settingsEditorOpen, setSettingsEditorOpen] = useState(false);
  const [customAgentDialogOpen, setCustomAgentDialogOpen] = useState(false);
  const [newJobDialogOpen, setNewJobDialogOpen] = useState(false);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [conversationDetailsOpen, setConversationDetailsOpen] = useState(false);
  const [detailsCopied, setDetailsCopied] = useState(false);
  const [libraryTemplates, setLibraryTemplates] = useState<JobLibraryTemplate[]>([]);
  const [addAgentDialogOpen, setAddAgentDialogOpen] = useState(false);
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [agentFlowError, setAgentFlowError] = useState<string | null>(null);
  const [loadingAgentTemplates, setLoadingAgentTemplates] = useState(false);
  const [addingAgentSlug, setAddingAgentSlug] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const lastSavedSettingsRef = useRef<string | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationsPanel = useHorizontalResize(340, 260, 520);
  const jobsPanel = useHorizontalResize(280, 220, 420);
  const treeNodes = useTreeStore((state) => state.nodes);
  const selectPage = useTreeStore((state) => state.selectPage);
  const setSection = useAppStore((state) => state.setSection);

  const allPages = flattenTree(treeNodes);
  const settingsAgentSlug =
    settingsTarget && settingsTarget !== "directory" ? settingsTarget : null;
  const filteredMentions = allPages.filter(
    (page) =>
      page.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  async function refreshAgents() {
    const response = await fetch("/api/agents/personas");
    if (!response.ok) return;
    const data = await response.json();
    const personas = (data.personas || []) as AgentListItem[];
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
    if (!hasLoadedConversations) {
      setConversationsLoading(true);
    }
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
    setHasLoadedConversations(true);
  }

  async function refreshLibrary() {
    const response = await fetch("/api/jobs/library");
    if (!response.ok) return;
    const data = await response.json();
    setLibraryTemplates((data.templates || []) as JobLibraryTemplate[]);
  }

  async function refreshSettings(
    agentSlug: string,
    options?: { resetJobEditor?: boolean }
  ) {
    const resetJobEditor = options?.resetJobEditor ?? true;

    if (agentSlug === "general") {
      setSettingsPersona(GENERAL_AGENT);
      setSettingsBody("");
      setSettingsJobs([]);
      if (resetJobEditor) {
        setSelectedJobId(null);
        setJobDraft(null);
        setNewJobDialogOpen(false);
        setLibraryDialogOpen(false);
      }
      lastSavedSettingsRef.current = JSON.stringify({
        name: GENERAL_AGENT.name || "",
        emoji: GENERAL_AGENT.emoji || "",
        role: GENERAL_AGENT.role || "",
        department: GENERAL_AGENT.department || "",
        type: GENERAL_AGENT.type || "",
        heartbeat: GENERAL_AGENT.heartbeat || "",
        workspace: GENERAL_AGENT.workspace || "",
        body: "",
      });
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
      lastSavedSettingsRef.current = JSON.stringify({
        name: data.persona.name || "",
        emoji: data.persona.emoji || "",
        role: data.persona.role || "",
        department: data.persona.department || "",
        type: data.persona.type || "",
        heartbeat: data.persona.heartbeat || "",
        workspace: data.persona.workspace || "",
        body: data.persona.body || "",
      });
      // Auto-open edit dialog for agents that haven't completed initial setup
      if (!data.persona.setupComplete && agentSlug !== "general") {
        handleSettingsEditorOpenChange(true);
      }
    }

    if (jobsResponse.ok) {
      const data = await jobsResponse.json();
      setSettingsJobs((data.jobs || []) as JobConfig[]);
    } else {
      setSettingsJobs([]);
    }
    if (resetJobEditor) {
      setSelectedJobId(null);
      setJobDraft(null);
      setNewJobDialogOpen(false);
      setLibraryDialogOpen(false);
    }
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
    const el = composerTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [composerInput]);

  useEffect(() => {
    void refreshLibrary();
  }, []);

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
    setSettingsTarget(selectedScope === "agent" ? selectedAgentSlug || null : null);
    setHasLoadedConversations(false);
    setConversationsLoading(true);
    setMode(selectedScope === "agent" && selectedAgentSlug ? "settings" : "composer");
  }, [selectedAgentSlug, selectedScope]);

  function openAgentWorkspace(agentSlug: string) {
    setActiveAgentSlug(agentSlug);
    setSelectedConversationId(null);
    setSelectedConversation(null);
    setSettingsTarget(agentSlug);
    setMode("settings");
    setSection({ type: "agent", slug: agentSlug });
  }

  useEffect(() => {
    if (mode === "settings" && settingsAgentSlug) {
      void refreshSettings(settingsAgentSlug, { resetJobEditor: true });
    }
  }, [mode, settingsAgentSlug]);

  useEffect(() => {
    if (!settingsAgentSlug) {
      setJobDraft(null);
      return;
    }

    if (!selectedJobId) {
      setJobDraft(null);
      return;
    }

    if (selectedJobId === "__new__") return;

    const existingJob = settingsJobs.find((job) => job.id === selectedJobId);
    if (existingJob) {
      setJobDraft({ ...existingJob });
      return;
    }

    setSelectedJobId(null);
    setJobDraft(null);
  }, [settingsAgentSlug, settingsJobs, selectedJobId]);

  useEffect(() => {
    if (mode !== "settings" || !settingsAgentSlug || settingsAgentSlug === "general") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetch("/api/ai/render-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: settingsBody }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          setSettingsBodyHtml(data?.html || "");
        })
        .catch(() => {
          setSettingsBodyHtml("");
        });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [mode, settingsAgentSlug, settingsBody]);

  useEffect(() => {
    if (!settingsEditorOpen || !settingsPersona || settingsAgentSlug === "general") {
      return;
    }

    setSettingsEditorDraft({ ...settingsPersona });
    setSettingsEditorBody(settingsBody);
    setSettingsEditorBodyHtml(settingsBodyHtml);
    setSettingsBodyMode("preview");
  }, [settingsAgentSlug, settingsBody, settingsBodyHtml, settingsEditorOpen, settingsPersona]);

  useEffect(() => {
    if (!settingsEditorOpen || settingsAgentSlug === "general") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetch("/api/ai/render-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: settingsEditorBody }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          setSettingsEditorBodyHtml(data?.html || "");
        })
        .catch(() => {
          setSettingsEditorBodyHtml("");
        });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [settingsAgentSlug, settingsEditorBody, settingsEditorOpen]);

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

  function openAgentSettings(agentSlug: string) {
    setMode("settings");
    setSettingsTarget(agentSlug);
    setSelectedJobId(null);
    setJobDraft(null);
  }

  function handleSettingsEditorOpenChange(open: boolean) {
    setSettingsEditorOpen(open);
    if (open) {
      setAgentFlowError(null);
    }
    if (!open) {
      // Mark setupComplete on close so the dialog doesn't auto-open again
      if (settingsAgentSlug && settingsAgentSlug !== "general" && settingsPersona && !settingsPersona.setupComplete) {
        setSettingsPersona({ ...settingsPersona, setupComplete: true });
        fetch(`/api/agents/personas/${settingsAgentSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setupComplete: true }),
        }).catch(() => {});
      }
      setSettingsEditorDraft(null);
      setSettingsEditorBody("");
      setSettingsEditorBodyHtml("");
      setSettingsBodyMode("preview");
    }
  }

  function handleCustomAgentDialogOpenChange(open: boolean) {
    setCustomAgentDialogOpen(open);
    if (!open) {
      setNewAgentDraft(DEFAULT_NEW_AGENT);
      setAgentFlowError(null);
    }
  }

  function openCustomAgentDialog() {
    setAddAgentDialogOpen(false);
    setNewAgentDraft(DEFAULT_NEW_AGENT);
    setAgentFlowError(null);
    setCustomAgentDialogOpen(true);
  }

  async function openAddAgentDialog() {
    setAgentFlowError(null);
    if (mode !== "settings") {
      setMode("settings");
      if (!settingsTarget) {
        setSettingsTarget("directory");
      }
    }
    setAddAgentDialogOpen(true);
    if (agentTemplates.length === 0) {
      setLoadingAgentTemplates(true);
      try {
        const res = await fetch("/api/agents/library");
        if (!res.ok) {
          setAgentFlowError(
            await readErrorMessage(res, "Unable to load the agent library right now.")
          );
          return;
        }
        const data = await res.json();
        setAgentTemplates(data.templates || []);
      } catch {
        setAgentFlowError("Unable to load the agent library right now.");
      } finally {
        setLoadingAgentTemplates(false);
      }
    }
  }

  async function addAgentFromTemplate(template: AgentTemplate) {
    setAgentFlowError(null);
    setAddingAgentSlug(template.slug);
    try {
      const res = await fetch(`/api/agents/library/${template.slug}/add`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 409) {
          // Agent already exists — just open its settings
          setAddAgentDialogOpen(false);
          await refreshAgents();
          setSection({ type: "agent", slug: template.slug });
          openAgentSettings(template.slug);
          await refreshSettings(template.slug);
          handleSettingsEditorOpenChange(true);
          return;
        }
        setAgentFlowError(
          await readErrorMessage(res, `Unable to add ${template.name} right now.`)
        );
        return;
      }
      setAddAgentDialogOpen(false);
      await refreshAgents();
      setSection({ type: "agent", slug: template.slug });
      openAgentSettings(template.slug);
      await refreshSettings(template.slug);
      handleSettingsEditorOpenChange(true);
    } catch {
      setAgentFlowError(`Unable to add ${template.name} right now.`);
    } finally {
      setAddingAgentSlug(null);
    }
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

  async function submitConversation(targetAgentSlug: string) {
    if (!composerInput.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug: targetAgentSlug,
          userMessage: composerInput.trim(),
          mentionedPaths,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const conversation = data.conversation as ConversationMeta;
      setComposerInput("");
      setMentionedPaths([]);
      setActiveAgentSlug(targetAgentSlug);
      setSection({ type: "agent", slug: targetAgentSlug });
      setSelectedConversationId(conversation.id);
      setMode("conversation");
      await refreshConversations();
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAgentSettings() {
    if (!settingsAgentSlug || settingsAgentSlug === "general" || !settingsEditorDraft) {
      handleSettingsEditorOpenChange(false);
      return;
    }

    setAgentFlowError(null);
    const nextSnapshot = JSON.stringify({
      name: settingsEditorDraft.name || "",
      emoji: settingsEditorDraft.emoji || "",
      role: settingsEditorDraft.role || "",
      department: settingsEditorDraft.department || "",
      type: settingsEditorDraft.type || "",
      heartbeat: settingsEditorDraft.heartbeat || "",
      workspace: settingsEditorDraft.workspace || "",
      body: settingsEditorBody,
    });
    const needsSetupCompletion = settingsEditorDraft.setupComplete !== true;

    setSavingSettings(true);
    try {
      const payload =
        nextSnapshot === lastSavedSettingsRef.current
          ? { setupComplete: true }
          : {
              ...JSON.parse(nextSnapshot),
              setupComplete: true,
            };
      const response = await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setAgentFlowError(
          await readErrorMessage(response, "Unable to save this agent right now.")
        );
        return;
      }
      if (!needsSetupCompletion || nextSnapshot !== lastSavedSettingsRef.current) {
        lastSavedSettingsRef.current = nextSnapshot;
      }
      setSettingsPersona({ ...settingsEditorDraft, setupComplete: true });
      setSettingsBody(settingsEditorBody);
      await refreshAgents();
      await refreshSettings(settingsAgentSlug, { resetJobEditor: false });
      handleSettingsEditorOpenChange(false);
    } catch {
      setAgentFlowError("Unable to save this agent right now.");
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
    await refreshSettings(settingsAgentSlug, { resetJobEditor: false });
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
    if (!settingsAgentSlug) return;
    setSelectedJobId("__new__");
    setJobDraft(blankJobDraft(settingsAgentSlug));
    setNewJobDialogOpen(true);
  }

  function openJob(jobId: string) {
    setSelectedJobId(jobId);
  }

  function applyLibraryTemplate(template: JobLibraryTemplate) {
    if (!settingsAgentSlug) return;
    setSelectedJobId("__new__");
    setJobDraft({
      ...blankJobDraft(settingsAgentSlug),
      id: template.id,
      name: template.name,
      schedule: template.schedule,
      prompt: template.prompt,
      timeout: template.timeout || 600,
    });
    setLibraryDialogOpen(false);
    setNewJobDialogOpen(true);
  }

  function closeNewJobDialog() {
    setNewJobDialogOpen(false);
    if (selectedJobId === "__new__") {
      setSelectedJobId(null);
      setJobDraft(null);
    }
  }

  async function saveJob() {
    if (!settingsAgentSlug || !jobDraft) return;
    const isNew = selectedJobId === "__new__" || !selectedJobId;
    const endpoint = isNew
      ? `/api/agents/${settingsAgentSlug}/jobs`
      : `/api/agents/${settingsAgentSlug}/jobs/${selectedJobId}`;
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
      await refreshSettings(settingsAgentSlug, { resetJobEditor: false });
      setSelectedJobId(nextJob.id);
      if (isNew) {
        setNewJobDialogOpen(false);
      }
    } finally {
      setSavingJob(false);
    }
  }

  async function deleteJob(jobId: string) {
    if (!settingsAgentSlug) return;
    setDeletingJobId(jobId);
    try {
      await fetch(`/api/agents/${settingsAgentSlug}/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setJobDraft(null);
      }
      await refreshSettings(settingsAgentSlug, { resetJobEditor: false });
    } finally {
      setDeletingJobId(null);
    }
  }

  async function toggleJob(job: JobConfig) {
    if (!settingsAgentSlug) return;
    await fetch(`/api/agents/${settingsAgentSlug}/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    await refreshSettings(settingsAgentSlug, { resetJobEditor: false });
    await refreshConversations();
  }

  async function runJob(jobId: string) {
    if (!settingsAgentSlug) return;
    setRunningJobId(jobId);
    try {
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
    } finally {
      setRunningJobId(null);
    }
  }

  async function createAgent() {
    const slug = slugify(newAgentDraft.slug || newAgentDraft.name);
    if (!newAgentDraft.name.trim() || !newAgentDraft.role.trim() || !slug) return;

    setAgentFlowError(null);
    if (agents.some((agent) => agent.slug === slug)) {
      handleCustomAgentDialogOpenChange(false);
      setSection({ type: "agent", slug });
      openAgentSettings(slug);
      await refreshSettings(slug);
      handleSettingsEditorOpenChange(true);
      return;
    }

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

      if (!response.ok) {
        setAgentFlowError(
          await readErrorMessage(response, "Unable to create this agent right now.")
        );
        return;
      }
      handleCustomAgentDialogOpenChange(false);
      await refreshAgents();
      setSection({ type: "agent", slug });
      openAgentSettings(slug);
      await refreshSettings(slug);
      handleSettingsEditorOpenChange(true);
    } catch {
      setAgentFlowError("Unable to create this agent right now.");
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
      handleSettingsEditorOpenChange(false);
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
  const selectedConversationDebugText = selectedConversationMeta
    ? [
        `Conversation ID: ${selectedConversationMeta.id}`,
        `Title: ${selectedConversationMeta.title}`,
        `Agent: ${selectedConversationMeta.agentSlug}`,
        `Trigger: ${selectedConversationMeta.trigger}`,
        `Status: ${selectedConversationMeta.status}`,
        `Job ID: ${selectedConversationMeta.jobId || "Not available"}`,
        `Job name: ${selectedConversationMeta.jobName || "Not available"}`,
        `Started at: ${formatTimestamp(selectedConversationMeta.startedAt)}`,
        `Completed at: ${formatTimestamp(selectedConversationMeta.completedAt)}`,
        `Exit code: ${selectedConversationMeta.exitCode ?? "Not available"}`,
        `Prompt path: ${selectedConversationMeta.promptPath}`,
        `Transcript path: ${selectedConversationMeta.transcriptPath}`,
        `Mentioned paths: ${selectedConversationMeta.mentionedPaths.join(", ") || "None"}`,
        `Artifact paths: ${selectedConversationMeta.artifactPaths.join(", ") || "None"}`,
      ].join("\n")
    : "";
  const groupedAgentTemplates = Object.entries(
    agentTemplates.reduce<Record<string, AgentTemplate[]>>((acc, template) => {
      const department = template.department || "general";
      if (!acc[department]) acc[department] = [];
      acc[department].push(template);
      return acc;
    }, {})
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([department, templates]) => [
      department,
      [...templates].sort((left, right) => left.name.localeCompare(right.name)),
    ] as const);
  const settingsDirty = !!settingsEditorDraft && JSON.stringify({
    name: settingsEditorDraft.name || "",
    emoji: settingsEditorDraft.emoji || "",
    role: settingsEditorDraft.role || "",
    department: settingsEditorDraft.department || "",
    type: settingsEditorDraft.type || "",
    heartbeat: settingsEditorDraft.heartbeat || "",
    workspace: settingsEditorDraft.workspace || "",
    body: settingsEditorBody,
  }) !== lastSavedSettingsRef.current;
  const canSaveSettings = !!settingsEditorDraft && (
    settingsDirty || settingsEditorDraft.setupComplete !== true
  );
  const chiefAgent = findChiefAgent(agents);
  const orgRoot = chiefAgent || {
    name: "CEO",
    slug: "__ceo_fallback__",
    emoji: "👑",
    role: "Executive lead not configured yet",
    department: "executive",
    type: "lead",
    active: false,
    runningCount: 0,
  };
  const orgAgents = agents
    .filter((agent) => agent.slug !== orgRoot.slug)
    .sort(sortOrgAgents);
  const groupedOrgAgents = Object.entries(
    orgAgents.reduce<Record<string, AgentListItem[]>>((acc, agent) => {
      const department = agent.department || "general";
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(agent);
      return acc;
    }, {})
  )
    .sort(([left], [right]) => {
      if (left === "general") return 1;
      if (right === "general") return -1;
      return startCase(left).localeCompare(startCase(right));
    })
    .map(([department, departmentAgents]) => ({
      department,
      label: startCase(department, "General"),
      agents: departmentAgents.sort(sortOrgAgents),
    }));
  const orgAgentCount = orgAgents.length + (chiefAgent ? 1 : 0);
  const activeOrgCount =
    orgAgents.filter((agent) => agent.active || (agent.runningCount || 0) > 0).length +
    (orgRoot.active || (orgRoot.runningCount || 0) > 0 ? 1 : 0);

  function renderOrgChartHeader() {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h3 className="text-[15px] font-semibold">Your Team Org Chart</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
              <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Agents
              </span>
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold text-background">
                {orgAgentCount}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
              <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Departments
              </span>
              <span className="rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
                {groupedOrgAgents.length}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
              <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Active
              </span>
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                {activeOrgCount}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={openAddAgentDialog}>
            <Plus className="h-3.5 w-3.5" />
            Add agent
          </Button>
        </div>
      </div>
    );
  }

  function renderOrganizationChart() {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-[30px] bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border)/0.55)_1px,transparent_0)] [background-size:22px_22px] p-4 sm:p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  if (chiefAgent) {
                    openAgentWorkspace(chiefAgent.slug);
                  }
                }}
                disabled={!chiefAgent}
                className={cn(
                  "group relative w-full max-w-lg overflow-hidden rounded-[26px] px-4 py-4 text-left transition",
                  chiefAgent
                    ? "bg-primary/[0.08] hover:-translate-y-0.5 hover:bg-primary/[0.11]"
                    : "bg-card"
                )}
              >
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <ActivityBeacon active={isAgentWorking(orgRoot)} />
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/70 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background/75 text-[26px]">
                    {orgRoot.emoji || "👑"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-background/72 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                      <Crown className="h-3 w-3" />
                      CEO
                    </div>
                    <h5 className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-foreground">
                      {orgRoot.name}
                    </h5>
                    <p className="mt-0.5 text-[13px] text-foreground/85">
                      {orgRoot.role || "Chief Executive Officer"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full bg-background/72 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    {startCase(orgRoot.type, "Lead")}
                  </span>
                </div>
              </button>

              <div className="mt-3 hidden h-12 w-full max-w-4xl md:block">
                <div className="relative mx-auto h-7 w-px overflow-visible">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/[0.03] via-primary/[0.11] to-primary/[0.025]" />
                  <div className="absolute inset-x-[-3px] inset-y-0 rounded-full bg-gradient-to-b from-primary/0 via-primary/[0.07] to-primary/0 blur-[4px]" />
                </div>
                <div className="relative mx-auto h-px w-[82%] overflow-visible rounded-full">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/[0.11] to-primary/0" />
                  <div className="absolute inset-x-[10%] inset-y-[-3px] rounded-full bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent blur-[5px]" />
                </div>
              </div>
            </div>

            {groupedOrgAgents.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {groupedOrgAgents.map((group) => {
                  const leadCount = group.agents.filter((agent) => agent.type === "lead").length;

                  return (
                    <div key={group.department} className="relative pt-3">
                      <div className="absolute left-1/2 top-0 hidden h-3 w-px -translate-x-1/2 overflow-visible md:block">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/[0.03] via-primary/[0.1] to-primary/[0.025]" />
                        <div className="absolute inset-x-[-3px] inset-y-0 rounded-full bg-gradient-to-b from-primary/0 via-primary/[0.06] to-primary/0 blur-[4px]" />
                      </div>
                      <section className="relative h-full rounded-[26px] bg-primary/[0.08] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h5 className="text-[16px] font-semibold tracking-[-0.03em] text-foreground">
                              {group.label}
                            </h5>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {group.agents.length} {group.agents.length === 1 ? "agent" : "agents"}
                            </p>
                          </div>
                          {leadCount > 0 ? (
                            <div className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                              {`${leadCount} lead`}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-2.5">
                          {group.agents.map((agent) => (
                            <button
                              key={agent.slug}
                              type="button"
                              onClick={() => openAgentWorkspace(agent.slug)}
                              className="group w-full rounded-2xl bg-background/72 p-3 text-left transition hover:-translate-y-0.5 hover:bg-background/84"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/78 text-[22px]">
                                  {agent.emoji || "🤖"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-[13px] font-semibold text-foreground">
                                          {agent.name}
                                        </p>
                                        <ActivityBeacon active={isAgentWorking(agent)} />
                                      </div>
                                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                                        {agent.role || "Role not set"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <span className="inline-flex items-center rounded-full bg-background/76 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      {startCase(agent.type, "Specialist")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[26px] bg-card p-6 text-center text-[13px] text-muted-foreground">
                Add more agents to start populating departments under the CEO.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsComposerPanel(agentSlug: string) {
    const panelAgent = agents.find((agent) => agent.slug === agentSlug) || null;

    return (
      <div className="relative z-20 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative flex flex-col">
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
                void submitConversation(agentSlug);
              }
            }}
            ref={composerTextareaRef}
            placeholder={`Ask ${panelAgent?.name || agentSlug} to work on something. Type @ to attach a page as context.`}
            style={{ minHeight: "80px", maxHeight: "260px" }}
            className="pointer-events-auto w-full resize-none overflow-y-auto bg-transparent px-4 pt-4 pb-2 text-[13px] text-foreground caret-foreground outline-none placeholder:text-muted-foreground/60"
          />
          {mentionedPaths.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
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
            <div className="absolute inset-x-0 bottom-11 z-20 rounded-xl border border-border bg-popover p-1 shadow-lg">
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
          <div className="flex items-center justify-end gap-2 px-4 pb-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
              <span>+</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            </div>
            <Button
              className="h-8 gap-2 text-xs"
              onClick={() => void submitConversation(agentSlug)}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Start
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function copyConversationDetails() {
    if (!selectedConversationDebugText) return;
    await navigator.clipboard.writeText(selectedConversationDebugText);
    setDetailsCopied(true);
    window.setTimeout(() => setDetailsCopied(false), 1500);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className="shrink-0 bg-background"
        style={{ width: conversationsPanel.width }}
      >
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            {activeAgent ? (
              <button
                onClick={() => openAgentSettings(activeAgent.slug)}
                className="rounded-xl bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/60"
              >
                <h3 className="text-[14px] font-semibold">
                  {activeAgent.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {`Recent runs for ${activeAgent.name}`}
                </p>
              </button>
            ) : (
              <div className="rounded-xl bg-muted/40 px-3 py-2">
                <h3 className="text-[14px] font-semibold">All agents</h3>
                <p className="text-[11px] text-muted-foreground">
                  Recent runs across your whole team
                </p>
              </div>
            )}
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
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["all", "manual", "job", "heartbeat"] as TriggerFilter[]).map((filter) => (
              <TriggerChip
                key={filter}
                active={triggerFilter === filter}
                onClick={() => setTriggerFilter(filter)}
              >
                {filter === "all" ? (
                  "All"
                ) : filter === "job" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <TriggerIcon trigger="job" />
                    Jobs
                  </span>
                ) : filter === "heartbeat" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <TriggerIcon trigger="heartbeat" />
                    Heartbeat
                  </span>
                ) : (
                  "Manual"
                )}
              </TriggerChip>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["all", "running", "completed", "failed"] as StatusFilter[]).map((filter) => (
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
          <div>
            {conversationsLoading && conversations.length > 0 ? (
              <div className="flex items-center gap-2 px-3 py-6 text-[12px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : !hasLoadedConversations && conversations.length === 0 ? (
              <div className="px-3 py-8" />
            ) : conversations.length === 0 ? (
              <div className="animate-in fade-in duration-300 px-3 py-8 text-[12px] text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              conversations.map((conversation) => {
                const agent = agents.find((entry) => entry.slug === conversation.agentSlug);
                const isSelected = selectedConversationId === conversation.id;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      setMode("conversation");
                    }}
                    className={cn(
                      "relative flex w-full items-start gap-2 border-b border-border/70 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isSelected ? "bg-primary/5" : "hover:bg-accent/35"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="mt-0.5 shrink-0">
                      {conversation.status === "running" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : conversation.status === "failed" ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11.5px] font-medium leading-[1.35] text-foreground">
                          {conversation.title}
                        </p>
                        <span
                          aria-label={TRIGGER_LABELS[conversation.trigger]}
                          title={TRIGGER_LABELS[conversation.trigger]}
                          className={cn(
                            "inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full",
                            TASK_CARD_TRIGGER_STYLES[conversation.trigger]
                          )}
                        >
                          <TriggerIcon trigger={conversation.trigger} className="h-2.75 w-2.75" />
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <p className="truncate">{agent?.name || conversation.agentSlug}</p>
                        <span className="shrink-0">{formatRelative(conversation.startedAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="relative z-10 w-px shrink-0 bg-border">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize conversations panel"
          onPointerDown={conversationsPanel.startResize}
          className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize bg-transparent"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "conversation" && selectedConversationMeta ? (
          <div className="flex h-full min-h-0 flex-col">
            <Dialog open={conversationDetailsOpen} onOpenChange={setConversationDetailsOpen}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3 pr-10">
                    <DialogTitle>Job Details</DialogTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => void copyConversationDetails()}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {detailsCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </DialogHeader>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
                    {selectedConversationDebugText}
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
            <div className="border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {agents.find((agent) => agent.slug === selectedConversationMeta.agentSlug)?.emoji || "🤖"}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold">{selectedConversationMeta.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedConversationMeta.agentSlug} · {TRIGGER_LABELS[selectedConversationMeta.trigger]} ·{" "}
                    {selectedConversationMeta.status}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-muted-foreground"
                    onClick={() => setConversationDetailsOpen(true)}
                  >
                    <Copy className="h-3 w-3" />
                    Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-muted-foreground"
                    onClick={() => openAgentSettings(selectedConversationMeta.agentSlug)}
                  >
                    <Settings className="h-3 w-3" />
                    Settings
                  </Button>
                </div>
              </div>
              {selectedConversation?.artifacts && selectedConversation.artifacts.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {selectedConversation.artifacts.map((artifact) => (
                    <button
                      key={artifact.path}
                      onClick={() => {
                        selectPage(artifact.path);
                        setSection({ type: "page" });
                      }}
                      className="shrink-0 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {artifact.label || artifact.path.split("/").pop()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedConversationMeta.status === "running" ? (
                <WebTerminal
                  sessionId={selectedConversationMeta.id}
                  displayPrompt={selectedConversationMeta.title}
                  reconnect
                  themeSurface="page"
                  onClose={() => {
                    void refreshConversations();
                  }}
                />
              ) : selectedConversation ? (
                <ConversationResultView
                  detail={selectedConversation}
                  onOpenArtifact={(artifactPath) => {
                    selectPage(artifactPath);
                    setSection({ type: "page" });
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading conversation...
                </div>
              )}
            </div>
          </div>
        ) : mode === "settings" ? (
          <div className="flex h-full min-h-0 flex-col">
            <Dialog open={addAgentDialogOpen} onOpenChange={setAddAgentDialogOpen}>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        <DialogTitle>Browse Agent Library</DialogTitle>
                      </div>
                      <DialogDescription>
                        Bring in a predefined agent, or open a custom editor and make your own.
                      </DialogDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={openCustomAgentDialog}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Edit your own agent
                    </Button>
                  </div>
                  {agentFlowError ? (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {agentFlowError}
                    </p>
                  ) : null}
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                  <div className="flex flex-col gap-6 pr-2">
                    {loadingAgentTemplates ? (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading the agent library...
                      </div>
                    ) : groupedAgentTemplates.length > 0 ? (
                      groupedAgentTemplates.map(([department, templates]) => (
                        <div key={department} className="flex flex-col gap-3">
                          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {department}
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {templates.map((template) => (
                              <div
                                key={template.slug}
                                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">{template.emoji || "🤖"}</span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="truncate text-[13px] font-semibold">
                                      {template.name}
                                    </h4>
                                    <p className="mt-1 text-[11px] text-foreground/85">
                                      {template.role || "No role summary yet"}
                                    </p>
                                    {template.description ? (
                                      <p className="mt-2 line-clamp-3 text-[11px] text-muted-foreground">
                                        {template.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => addAgentFromTemplate(template)}
                                  disabled={addingAgentSlug === template.slug}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {addingAgentSlug === template.slug ? "Bringing in..." : "Bring in"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                        No predefined agents are available right now. Use &ldquo;Edit your own
                        agent&rdquo; to create one from scratch.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={customAgentDialogOpen} onOpenChange={handleCustomAgentDialogOpenChange}>
              <DialogContent className="sm:max-w-4xl">
                <DialogHeader className="gap-1">
                  <DialogTitle>Edit your own agent</DialogTitle>
                  <DialogDescription>
                    Create a custom agent from scratch, then fine-tune it in the same popup flow.
                  </DialogDescription>
                  {agentFlowError ? (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {agentFlowError}
                    </p>
                  ) : null}
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                  <div className="grid gap-4 pr-2 md:grid-cols-2">
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
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <span>Heartbeat</span>
                      <SchedulePicker
                        value={newAgentDraft.heartbeat || "0 */4 * * *"}
                        onChange={(cron) =>
                          setNewAgentDraft({
                            ...newAgentDraft,
                            heartbeat: cron,
                          })
                        }
                      />
                    </div>
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
                    <label className="space-y-1 text-[11px] text-muted-foreground md:col-span-2">
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
                    <div className="space-y-2 text-[11px] text-muted-foreground md:col-span-2">
                      <span>Avatar</span>
                      <div className="flex flex-wrap gap-2">
                        {AGENT_EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
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
                    <label className="space-y-1 text-[11px] text-muted-foreground md:col-span-2">
                      <span>Instructions</span>
                      <textarea
                        value={newAgentDraft.body}
                        onChange={(event) =>
                          setNewAgentDraft({ ...newAgentDraft, body: event.target.value })
                        }
                        className="min-h-[240px] w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                        placeholder="Define how this agent should work inside Cabinet and the KB."
                      />
                    </label>
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between border-t border-border pt-3">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleCustomAgentDialogOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => void createAgent()}
                      disabled={creatingAgent || !newAgentDraft.name.trim() || !newAgentDraft.role.trim()}
                    >
                      {creatingAgent ? "Creating..." : "Create agent"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {settingsTarget === "directory" || !settingsTarget ? (
              <div className="border-b border-border px-5 py-4">
                {renderOrgChartHeader()}
              </div>
            ) : null}
            {settingsPersona ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{settingsAgent?.emoji || "🤖"}</span>
                      <h3 className="text-[15px] font-semibold">
                        {settingsAgent?.name || "Agent settings"}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleSettingsEditorOpenChange(true)}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Edit agent
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={runHeartbeatNow}>
                        <Zap className="h-3.5 w-3.5" />
                        Run heartbeat
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={toggleAgentActive}>
                        {settingsPersona.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {settingsPersona.active ? "Pause" : "Activate"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-2">
                    <div className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Role</div>
                      <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                        {settingsPersona.role || "Not set"}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Department</div>
                      <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                        {settingsPersona.department || "Not set"}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Type</div>
                      <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                        {settingsPersona.type || "Not set"}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Heartbeat</div>
                      <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                        {settingsPersona.heartbeat ? cronToHuman(settingsPersona.heartbeat) : "Not set"}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Workspace</div>
                      <div className="min-w-0 break-all font-mono text-[12px] leading-tight text-foreground line-clamp-2">
                        {settingsPersona.workspace || "Not set"}
                      </div>
                    </div>
                  </div>
                </div>

                <Dialog open={settingsEditorOpen} onOpenChange={handleSettingsEditorOpenChange}>
                  <DialogContent className="sm:max-w-5xl">
                    <DialogHeader className="gap-1">
                      <DialogTitle>Edit Agent</DialogTitle>
                      <DialogDescription>
                        Review the live agent, make your changes here, and save when you are ready.
                      </DialogDescription>
                      {agentFlowError ? (
                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {agentFlowError}
                        </p>
                      ) : null}
                    </DialogHeader>
                    {settingsEditorDraft ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                              Instructions
                            </span>
                            <div className="flex rounded-lg bg-muted/60 p-0.5">
                              <button
                                type="button"
                                onClick={() => setSettingsBodyMode("write")}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-[11px] transition-colors",
                                  settingsBodyMode === "write"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Write
                              </button>
                              <button
                                type="button"
                                onClick={() => setSettingsBodyMode("preview")}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-[11px] transition-colors",
                                  settingsBodyMode === "preview"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                Preview
                              </button>
                            </div>
                          </div>
                          {settingsBodyMode === "write" ? (
                            <textarea
                              value={settingsEditorBody}
                              onChange={(event) => setSettingsEditorBody(event.target.value)}
                              className="h-[60vh] w-full resize-none rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                              placeholder="Write markdown for this agent's instructions."
                            />
                          ) : (
                            <div className="h-[60vh] overflow-auto rounded-lg bg-muted/60 px-3 py-3">
                              {settingsEditorBodyHtml ? (
                                <div
                                  className="prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-base prose-h2:text-[13px] prose-h3:text-[12px] prose-p:text-[12px] prose-p:text-foreground/85 prose-li:text-[12px] prose-li:text-foreground/85 prose-a:text-foreground prose-code:text-[11px] prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:rounded prose-pre:bg-background prose-pre:border-0 prose-pre:text-foreground prose-strong:text-foreground"
                                  dangerouslySetInnerHTML={{ __html: settingsEditorBodyHtml }}
                                />
                              ) : settingsEditorBody.trim() ? (
                                <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                                  {settingsEditorBody}
                                </pre>
                              ) : (
                                <div className="text-[12px] text-muted-foreground">
                                  Nothing to preview yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid content-start gap-2.5 sm:grid-cols-2 xl:grid-cols-2">
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Name</span>
                            <input
                              value={settingsEditorDraft.name || ""}
                              onChange={(event) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, name: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Role</span>
                            <input
                              value={settingsEditorDraft.role || ""}
                              onChange={(event) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, role: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <div className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Heartbeat</span>
                            <SchedulePicker
                              value={settingsEditorDraft.heartbeat || "0 */4 * * *"}
                              onChange={(cron) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, heartbeat: cron })
                              }
                            />
                          </div>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Department</span>
                            <input
                              value={settingsEditorDraft.department || ""}
                              onChange={(event) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, department: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Type</span>
                            <input
                              value={settingsEditorDraft.type || ""}
                              onChange={(event) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, type: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:col-span-2">
                            <span>Workspace</span>
                            <input
                              value={settingsEditorDraft.workspace || ""}
                              onChange={(event) =>
                                setSettingsEditorDraft({ ...settingsEditorDraft, workspace: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <div className="space-y-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:col-span-2">
                            <span>Avatar</span>
                            <div className="flex flex-wrap gap-2">
                              {AGENT_EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() =>
                                    setSettingsEditorDraft({ ...settingsEditorDraft, emoji })
                                  }
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-lg transition-colors",
                                    settingsEditorDraft.emoji === emoji
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:bg-accent/40"
                                  )}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3">
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
                        <Button
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => void saveAgentSettings()}
                          disabled={savingSettings || deletingAgent || !canSaveSettings}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingSettings ? "Saving..." : settingsEditorDraft.setupComplete ? "Save" : "Continue"}
                        </Button>
                      </div>
                    </div>
                    ) : (
                      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                        Loading agent editor...
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={newJobDialogOpen} onOpenChange={(open) => {
                  if (!open) {
                    closeNewJobDialog();
                    return;
                  }
                  setNewJobDialogOpen(true);
                }}>
                  <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                      <div className="flex items-center justify-between gap-3">
                        <DialogTitle>New Job</DialogTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setLibraryDialogOpen(true)}
                        >
                          Starter library
                        </Button>
                      </div>
                    </DialogHeader>
                    {jobDraft ? (
                      <div className="space-y-4">
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
                            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="weekly-strategy-digest"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Schedule</label>
                          <div className="mt-1">
                            <SchedulePicker
                              value={jobDraft.schedule || "0 9 * * 1-5"}
                              onChange={(cron) =>
                                setJobDraft((current) =>
                                  current ? { ...current, schedule: cron } : current
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Timeout (seconds)</label>
                          <input
                            type="number"
                            value={jobDraft.timeout || 600}
                            onChange={(event) =>
                              setJobDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      timeout: parseInt(event.target.value || "600", 10),
                                    }
                                  : current
                              )
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                          />
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
                            rows={12}
                            className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="What should this job do?"
                          />
                        </div>
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
                        <div className="flex justify-end gap-2 border-t border-border pt-3">
                          <Button variant="outline" size="sm" className="h-9 px-4" onClick={closeNewJobDialog}>
                            Cancel
                          </Button>
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
                            {savingJob ? "Saving..." : "Create job"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>

                <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Starter Library</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                      <div className="grid gap-3 pr-2 md:grid-cols-2">
                        {libraryTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="rounded-xl border border-border bg-background px-4 py-4"
                          >
                            <div className="flex h-full flex-col">
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium">{template.name}</div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {template.description}
                                </p>
                                <p className="mt-3 text-[10px] text-muted-foreground">
                                  Suggested schedule: {cronToHuman(template.schedule)}
                                </p>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => applyLibraryTemplate(template)}
                                >
                                  Use template
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <div className="flex h-full min-h-0">
                    <div
                      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-l-xl rounded-r-none border border-r-0 border-border"
                      style={{ width: jobsPanel.width }}
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div>
                          <h4
                            className="text-[13px] font-semibold"
                            title="Per-agent recurring prompts"
                          >
                            Jobs
                          </h4>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={startNewJobDraft}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New job
                        </Button>
                      </div>
                      <ScrollArea className="min-h-0 flex-1">
                        <div className="space-y-2 p-3">
                          {settingsJobs.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-3 py-6 text-[12px] text-muted-foreground">
                              No jobs yet. Start from scratch or use a library template.
                            </div>
                          ) : (
                            settingsJobs.map((job) => (
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
                                    onClick={() => openJob(job.id)}
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
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                                        <TriggerIcon trigger="job" className="h-2.5 w-2.5" />
                                        Job
                                      </span>
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
                                      {deletingJobId === job.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="relative z-10 w-px shrink-0 bg-border">
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize jobs panel"
                        onPointerDown={jobsPanel.startResize}
                        className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize bg-transparent"
                      />
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-r-xl rounded-l-none border border-l-0 border-border">
                      {jobDraft && selectedJobId !== "__new__" ? (
                        <ScrollArea className="min-h-0 flex-1">
                          <div className="space-y-4 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-[13px] font-semibold">
                                  {selectedJobId === "__new__" ? "New job" : "Job editor"}
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                  Edit the selected job for this agent.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {selectedJobId && selectedJobId !== "__new__" ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs"
                                      onClick={() => void runJob(selectedJobId)}
                                      disabled={runningJobId === selectedJobId}
                                    >
                                      {runningJobId === selectedJobId ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5" />
                                      )}
                                      Run
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1 text-xs text-destructive"
                                      onClick={() => void deleteJob(selectedJobId)}
                                      disabled={deletingJobId === selectedJobId}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </div>
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
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="weekly-strategy-digest"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Schedule</label>
                              <div className="mt-1">
                                <SchedulePicker
                                  value={jobDraft.schedule || "0 9 * * 1-5"}
                                  onChange={(cron) =>
                                    setJobDraft((current) =>
                                      current ? { ...current, schedule: cron } : current
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground">Timeout (seconds)</label>
                              <input
                                type="number"
                                value={jobDraft.timeout || 600}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          timeout: parseInt(event.target.value || "600", 10),
                                        }
                                      : current
                                  )
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                              />
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
                                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
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
                        </ScrollArea>
                      ) : (
                        <div className="flex h-full min-h-[280px] items-center justify-center">
                          <div className="max-w-sm space-y-3 px-6 text-center">
                            <h4 className="text-[13px] font-semibold">Select a job to edit</h4>
                            <p className="text-[12px] text-muted-foreground">
                              Existing jobs open here. Create a new job to start from scratch or choose a template inside the popup.
                            </p>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setLibraryDialogOpen(true)}
                              >
                                Library
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={startNewJobDraft}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                New job
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {settingsAgentSlug ? renderSettingsComposerPanel(settingsAgentSlug) : null}
                </div>
              </div>
            ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 p-5">
                {settingsTarget === "directory" || !settingsTarget ? (
                  renderOrganizationChart()
                ) : settingsAgentSlug === "general" ? (
                  <div className="max-w-3xl space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
                      General is manual-only in this MVP. Use it as the default place for ad-hoc conversations, and manage the rest of the team from the agent directory.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => openAgentWorkspace("general")}
                    >
                      Open General conversations
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                  </div>
                )}
              </div>
            </ScrollArea>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-border px-5 py-4">
              {renderOrgChartHeader()}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
              {renderOrganizationChart()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
