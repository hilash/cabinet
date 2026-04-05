"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Bot,
  CheckCircle2,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { cronToHuman } from "@/lib/agents/cron-utils";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import type { JobLibraryTemplate } from "@/lib/jobs/job-library";
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

function replacePastedTextNotice(output: string, displayPrompt?: string): string {
  if (!displayPrompt) return output;
  return output.replace(/\[Pasted text #\d+(?: \+\d+ lines)?\]/g, displayPrompt);
}

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
  const [agents, setAgents] = useState<AgentSummary[]>([]);
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
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState(false);
  const [newAgentDraft, setNewAgentDraft] = useState<NewAgentDraft>(DEFAULT_NEW_AGENT);
  const [settingsBodyHtml, setSettingsBodyHtml] = useState("");
  const [settingsBodyMode, setSettingsBodyMode] = useState<"write" | "preview">("preview");
  const [settingsEditorOpen, setSettingsEditorOpen] = useState(false);
  const [newJobDialogOpen, setNewJobDialogOpen] = useState(false);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [libraryTemplates, setLibraryTemplates] = useState<JobLibraryTemplate[]>([]);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const settingsLoadedRef = useRef(false);
  const lastSavedSettingsRef = useRef<string | null>(null);
  const conversationsPanel = useHorizontalResize(340, 260, 520);
  const jobsPanel = useHorizontalResize(280, 220, 420);
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
      settingsLoadedRef.current = true;
      lastSavedSettingsRef.current = JSON.stringify({
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
        role: data.persona.role || "",
        department: data.persona.department || "",
        type: data.persona.type || "",
        heartbeat: data.persona.heartbeat || "",
        workspace: data.persona.workspace || "",
        body: data.persona.body || "",
      });
      settingsLoadedRef.current = true;
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
      settingsLoadedRef.current = false;
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
    if (
      mode !== "settings" ||
      !settingsAgentSlug ||
      settingsAgentSlug === "general" ||
      !settingsPersona ||
      !settingsLoadedRef.current
    ) {
      return;
    }

    const nextSnapshot = JSON.stringify({
      role: settingsPersona.role || "",
      department: settingsPersona.department || "",
      type: settingsPersona.type || "",
      heartbeat: settingsPersona.heartbeat || "",
      workspace: settingsPersona.workspace || "",
      body: settingsBody,
    });

    if (nextSnapshot === lastSavedSettingsRef.current) return;

    const timeout = window.setTimeout(() => {
      void (async () => {
        const response = await fetch(`/api/agents/personas/${settingsAgentSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: nextSnapshot,
        });
        if (!response.ok) return;
        lastSavedSettingsRef.current = nextSnapshot;
      })();
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [mode, settingsAgentSlug, settingsPersona, settingsBody]);

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

  function renderSettingsComposerPanel(agentSlug: string) {
    const panelAgent = agents.find((agent) => agent.slug === agentSlug) || null;

    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[13px] font-semibold">Chat</h4>
            <p className="text-[11px] text-muted-foreground">
              Ask {panelAgent?.name || agentSlug} to work on something.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">Cmd/Ctrl + Enter to send</p>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col rounded-xl bg-muted/20 p-3">
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
            placeholder={`Ask ${panelAgent?.name || agentSlug} to work on something...`}
            className="min-h-0 flex-1 resize-none bg-transparent text-[13px] outline-none"
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
            <div className="absolute inset-x-3 bottom-14 z-20 rounded-xl border border-border bg-popover p-1 shadow-lg">
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
          <div className="mt-3 flex items-center justify-end">
            <Button
              className="h-8 gap-2 text-xs"
              onClick={() => void submitConversation(agentSlug)}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Start conversation
            </Button>
          </div>
        </div>
      </div>
    );
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

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize conversations panel"
        onPointerDown={conversationsPanel.startResize}
        className="relative w-3 shrink-0 cursor-col-resize bg-transparent"
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
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
                  displayPrompt={selectedConversationMeta.title}
                  reconnect
                  onClose={() => {
                    void refreshConversations();
                  }}
                />
              ) : selectedConversation ? (
                <ScrollArea className="h-full bg-[#0a0a0a]">
                  <pre className="min-h-full whitespace-pre-wrap p-5 font-mono text-[12px] leading-relaxed text-neutral-200">
                    {replacePastedTextNotice(
                      selectedConversation.transcript || "No transcript captured.",
                      selectedConversationMeta.title
                    )}
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
            {settingsTarget === "directory" || !settingsTarget || settingsTarget === "__new__" ? (
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  {settingsTarget === "directory" || !settingsTarget ? (
                    <div>
                      <h3 className="text-[15px] font-semibold">Agent settings</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Big-picture management for your team. Add agents, remove agents, or open detailed settings.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-[15px] font-semibold">Create agent</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Add a new agent to the team and define its default heartbeat and instructions.
                      </p>
                    </div>
                  )}
                  {(settingsTarget === "directory" || !settingsTarget) ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 gap-1 text-xs" onClick={startNewAgentDraft}>
                        <Plus className="h-3.5 w-3.5" />
                        Add agent
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {settingsPersona ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <div className="flex min-h-0 basis-[30%] flex-col gap-3 rounded-2xl border border-border bg-card p-4">
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
                        onClick={() => setSettingsEditorOpen(true)}
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

                  <div className="min-h-0 rounded-xl bg-muted/20 p-3">
                    <div className="flex h-full min-h-0 gap-3">
                      <div className="min-w-0 flex-[3]">
                        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden">
                          {settingsBodyHtml ? (
                            <div
                              className="prose prose-sm max-w-none opacity-90 prose-headings:mb-1 prose-headings:font-semibold prose-h1:text-sm prose-h2:text-[12px] prose-h3:text-[12px] prose-p:my-1 prose-p:text-[12px] prose-li:my-0 prose-li:text-[12px] prose-code:text-[11px] prose-code:bg-background prose-code:px-1 prose-code:rounded prose-pre:bg-background prose-pre:border-0 prose-strong:text-foreground"
                              dangerouslySetInnerHTML={{ __html: settingsBodyHtml }}
                            />
                          ) : settingsBody.trim() ? (
                            <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                              {settingsBody}
                            </pre>
                          ) : (
                            <div className="text-[12px] text-muted-foreground">
                              No instructions yet.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-[2] flex-col justify-between gap-2">
                        <div className="flex min-w-0 flex-1 gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                            <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-3">
                              {settingsPersona.role || "Not set"}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                            <div className="min-w-0 break-all font-mono text-[12px] leading-tight text-foreground line-clamp-3">
                              {settingsPersona.heartbeat || "Not set"}
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                            <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                              {settingsPersona.department || "Not set"}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                            <div className="min-w-0 break-words text-[12px] leading-tight text-foreground line-clamp-2">
                              {settingsPersona.type || "Not set"}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-muted/60 px-3 py-2">
                          <div className="min-w-0 break-all font-mono text-[12px] leading-tight text-foreground line-clamp-2">
                            {settingsPersona.workspace || "Not set"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Dialog open={settingsEditorOpen} onOpenChange={setSettingsEditorOpen}>
                  <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>Edit Agent</DialogTitle>
                    </DialogHeader>
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
                              value={settingsBody}
                              onChange={(event) => setSettingsBody(event.target.value)}
                              className="h-[60vh] w-full resize-none rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                              placeholder="Write markdown for this agent's instructions."
                            />
                          ) : (
                            <div className="h-[60vh] overflow-auto rounded-lg bg-muted/60 px-3 py-3">
                              {settingsBodyHtml ? (
                                <div
                                  className="prose prose-sm max-w-none prose-headings:font-semibold prose-h1:text-base prose-h2:text-[13px] prose-h3:text-[12px] prose-p:text-[12px] prose-li:text-[12px] prose-code:text-[11px] prose-code:bg-background prose-code:px-1 prose-code:rounded prose-pre:bg-background prose-pre:border-0 prose-strong:text-foreground"
                                  dangerouslySetInnerHTML={{ __html: settingsBodyHtml }}
                                />
                              ) : settingsBody.trim() ? (
                                <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                                  {settingsBody}
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
                            <span>Role</span>
                            <input
                              value={settingsPersona.role || ""}
                              onChange={(event) =>
                                setSettingsPersona({ ...settingsPersona, role: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Heartbeat</span>
                            <input
                              value={settingsPersona.heartbeat || ""}
                              onChange={(event) =>
                                setSettingsPersona({ ...settingsPersona, heartbeat: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Department</span>
                            <input
                              value={settingsPersona.department || ""}
                              onChange={(event) =>
                                setSettingsPersona({ ...settingsPersona, department: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            <span>Type</span>
                            <input
                              value={settingsPersona.type || ""}
                              onChange={(event) =>
                                setSettingsPersona({ ...settingsPersona, type: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:col-span-2">
                            <span>Workspace</span>
                            <input
                              value={settingsPersona.workspace || ""}
                              onChange={(event) =>
                                setSettingsPersona({ ...settingsPersona, workspace: event.target.value })
                              }
                              className="w-full rounded-lg bg-muted/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:bg-muted"
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end border-t border-border pt-3">
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
                      </div>
                    </div>
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
                      <DialogTitle>New Job</DialogTitle>
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
                          <input
                            value={jobDraft.schedule}
                            onChange={(event) =>
                              setJobDraft((current) =>
                                current ? { ...current, schedule: event.target.value } : current
                              )
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="0 9 * * 1"
                          />
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {jobDraft.schedule ? cronToHuman(jobDraft.schedule) : "No schedule set."}
                          </p>
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

                <div className="min-h-0 basis-1/2">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setLibraryDialogOpen(true)}
                          >
                            Starter library
                          </Button>
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

                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize jobs panel"
                      onPointerDown={jobsPanel.startResize}
                      className="relative w-3 shrink-0 cursor-col-resize bg-transparent"
                    >
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
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
                              <input
                                value={jobDraft.schedule}
                                onChange={(event) =>
                                  setJobDraft((current) =>
                                    current ? { ...current, schedule: event.target.value } : current
                                  )
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="0 9 * * 1"
                              />
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {jobDraft.schedule ? cronToHuman(jobDraft.schedule) : "No schedule set."}
                              </p>
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
                              Existing jobs open here. Create a new job or browse the starter library in a popup.
                            </p>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setLibraryDialogOpen(true)}
                              >
                                Starter library
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

                <div className="min-h-0 basis-[20%]">
                  {renderSettingsComposerPanel(settingsAgentSlug)}
                </div>
              </div>
            ) : (
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
                            onClick={() => openAgentWorkspace(agent.slug)}
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
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">Agent settings</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pick an agent on the left to open its settings and start a conversation from the same panel.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={startNewAgentDraft}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add agent
                </Button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center px-8 py-10">
              <div className="max-w-xl text-center">
                <Bot className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[14px] font-medium">Pick an agent from the left rail</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  The right panel now combines agent settings and the conversation composer in one place.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
