"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  HeartPulse,
  Inbox,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { buildConversationInstanceKey } from "@/lib/agents/conversation-identity";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { CABINET_VISIBILITY_OPTIONS } from "@/lib/cabinets/visibility";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import type { HumanInboxDraft } from "@/types/agents";
import type { CabinetOverview, CabinetVisibilityMode } from "@/types/cabinets";
import type {
  ConversationMeta,
  ConversationStatus,
  ConversationTrigger,
} from "@/types/conversations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VisibleAgent = CabinetOverview["agents"][number];
type TriggerFilter = "all" | ConversationTrigger;
type BoardLane = "inbox" | "running" | "completed" | "failed";

const PRIORITY_OPTIONS = [
  { label: "P0", value: "1" },
  { label: "P1", value: "2" },
  { label: "P2", value: "3" },
  { label: "P3", value: "4" },
] as const;

const TRIGGER_FILTERS: TriggerFilter[] = ["all", "manual", "job", "heartbeat"];

const LANE_COPY: Record<
  BoardLane,
  {
    title: string;
    description: string;
    icon: typeof Inbox;
    badge: string;
  }
> = {
  inbox: {
    title: "Inbox",
    description: "Unassigned ideas you want to execute.",
    icon: Inbox,
    badge: "bg-amber-500/10 text-amber-700",
  },
  running: {
    title: "Running",
    description: "Conversations already in motion.",
    icon: Loader2,
    badge: "bg-sky-500/10 text-sky-700",
  },
  completed: {
    title: "Completed",
    description: "Finished runs with outcomes attached.",
    icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-700",
  },
  failed: {
    title: "Failed",
    description: "Runs that need another pass.",
    icon: XCircle,
    badge: "bg-destructive/10 text-destructive",
  },
};

const TRIGGER_STYLES: Record<ConversationTrigger, string> = {
  manual: "bg-sky-500/12 text-sky-400 ring-1 ring-sky-500/20",
  job: "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/20",
  heartbeat: "bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/20",
};

const TRIGGER_LABELS: Record<ConversationTrigger, string> = {
  manual: "Manual",
  job: "Job",
  heartbeat: "Heartbeat",
};

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatRelative(iso?: string): string {
  if (!iso) return "just now";
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function scopedAgentKey(cabinetPath: string | undefined, slug: string): string {
  return `${cabinetPath || ROOT_CABINET_PATH}::agent::${slug}`;
}

function cabinetLabel(cabinetPath?: string): string | null {
  const resolved = cabinetPath || ROOT_CABINET_PATH;
  if (resolved === ROOT_CABINET_PATH) return null;
  return startCase(resolved.split("/").pop());
}

function visibleAgentCabinetLabel(
  agent: VisibleAgent | null,
  fallbackCabinetPath?: string
): string | null {
  if (agent) {
    return agent.cabinetPath === ROOT_CABINET_PATH
      ? null
      : agent.cabinetName || cabinetLabel(agent.cabinetPath);
  }

  return cabinetLabel(fallbackCabinetPath);
}

function priorityLabel(priority: number): string {
  if (priority <= 1) return "P0";
  if (priority <= 2) return "P1";
  if (priority <= 3) return "P2";
  return "P3";
}

function priorityTone(priority: number): string {
  if (priority <= 1) return "bg-destructive/10 text-destructive";
  if (priority <= 2) return "bg-amber-500/10 text-amber-700";
  if (priority <= 3) return "bg-sky-500/10 text-sky-700";
  return "bg-muted text-muted-foreground";
}

function draftPrompt(draft: HumanInboxDraft): string {
  return draft.description.trim()
    ? `${draft.title.trim()}\n\nContext:\n${draft.description.trim()}`
    : draft.title.trim();
}

const TRIGGER_CHIP_ACTIVE: Record<TriggerFilter, string> = {
  all: "bg-primary text-primary-foreground",
  manual: "bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/25",
  job: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25",
  heartbeat: "bg-pink-500/15 text-pink-600 ring-1 ring-pink-500/25",
};

function TriggerChip({
  filter,
  active,
  onClick,
  children,
}: {
  filter: TriggerFilter;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? TRIGGER_CHIP_ACTIVE[filter]
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
  trigger: ConversationTrigger;
  className?: string;
}) {
  if (trigger === "job") return <Clock3 className={className} />;
  if (trigger === "heartbeat") return <HeartPulse className={className} />;
  return <Bot className={className} />;
}

function ConversationStatusIcon({ status }: { status: ConversationStatus }) {
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-emerald-500" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }
  if (status === "failed") {
    return <XCircle className="size-4 text-destructive" />;
  }
  return <Circle className="size-4 text-muted-foreground/40" />;
}

function DraftStatusIcon() {
  return <Circle className="size-4 text-amber-600" />;
}

function CreateDraftDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  creating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  creating: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Inbox Task</DialogTitle>
          <DialogDescription>
            Capture something you want executed. You can assign the agent later from Inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="draft-title"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70"
            >
              Task title
            </label>
            <Input
              id="draft-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Draft the next task you want to execute"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="draft-context"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70"
            >
              Context
            </label>
            <textarea
              id="draft-context"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Optional details, constraints, or acceptance notes"
              className="min-h-[140px] rounded-[22px] border border-input bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[140px]">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                Priority
              </label>
              <Select
                items={PRIORITY_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={priority}
                onValueChange={(value) => onPriorityChange(String(value || "3"))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!title.trim() || creating}>
            {creating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Add to inbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDraftDialog({
  open,
  onOpenChange,
  draft,
  visibleAgents,
  selectedAgentId,
  onSelectedAgentIdChange,
  busyAction,
  onSaveForLater,
  onStartNow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: HumanInboxDraft | null;
  visibleAgents: VisibleAgent[];
  selectedAgentId: string | null;
  onSelectedAgentIdChange: (value: string | null) => void;
  busyAction: "save" | "start" | null;
  onSaveForLater: () => void;
  onStartNow: () => void;
}) {
  const agentItems = visibleAgents.map((agent) => ({
    label: `${agent.name}${agent.cabinetName ? ` · ${agent.cabinetName}` : ""}`,
    value: agent.scopedId,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Draft</DialogTitle>
          <DialogDescription>
            Pick the agent who should handle this task now or later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {draft ? (
            <div className="rounded-[22px] border border-border/70 bg-muted/25 px-4 py-3">
              <p className="text-[12px] font-medium text-foreground">{draft.title}</p>
              {draft.description ? (
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {draft.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Agent
            </label>
            <Select
              items={agentItems}
              value={selectedAgentId}
              onValueChange={(value) =>
                onSelectedAgentIdChange(typeof value === "string" ? value : null)
              }
              disabled={visibleAgents.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No visible agents" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {visibleAgents.map((agent) => (
                    <SelectItem key={agent.scopedId} value={agent.scopedId}>
                      <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
                      <span className="truncate">
                        {agent.name}
                        {agent.cabinetName ? ` · ${agent.cabinetName}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onSaveForLater}
            disabled={!selectedAgentId || busyAction !== null}
          >
            {busyAction === "save" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Save for later
          </Button>
          <Button onClick={onStartNow} disabled={!selectedAgentId || busyAction !== null}>
            {busyAction === "start" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            Start now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftRow({
  draft,
  assignedAgentLabel,
  assignedCabinetLabel,
  canStartNow,
  busy,
  onAssign,
  onChangeAssignment,
  onStartNow,
}: {
  draft: HumanInboxDraft;
  assignedAgentLabel: string | null;
  assignedCabinetLabel: string | null;
  canStartNow: boolean;
  busy: boolean;
  onAssign: () => void;
  onChangeAssignment: () => void;
  onStartNow: () => void;
}) {
  const assignmentText = assignedAgentLabel
    ? `Assigned to ${assignedAgentLabel}${assignedCabinetLabel ? ` · ${assignedCabinetLabel}` : ""}`
    : "Not assigned yet";

  return (
    <article className="border-b border-border/70 transition-colors hover:bg-accent/35 last:border-b-0">
      <div className="flex items-start gap-2 px-3 py-2">
        <div className="mt-0.5 shrink-0">
          <DraftStatusIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium leading-[1.35] text-foreground">
                {draft.title}
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <p className="truncate">{assignmentText}</p>
                <span className="shrink-0">{formatRelative(draft.updatedAt)}</span>
              </div>
            </div>

            <span
              className={cn(
                "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]",
                priorityTone(draft.priority)
              )}
            >
              {priorityLabel(draft.priority)}
            </span>
          </div>

          {draft.description ? (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-4.5 text-muted-foreground">
              {draft.description}
            </p>
          ) : null}

          {!assignedAgentLabel && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Choose an agent when you are ready to execute it.
            </p>
          )}

          {assignedAgentLabel && !canStartNow ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Assigned agent is not visible in this scope right now.
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {!assignedAgentLabel ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={onAssign}
                disabled={busy}
              >
                <Send data-icon="inline-start" />
                Assign
              </Button>
            ) : null}

            {assignedAgentLabel ? (
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={onStartNow}
                disabled={busy || !canStartNow}
              >
                {busy ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Play data-icon="inline-start" />
                )}
                Start now
              </Button>
            ) : null}

            {assignedAgentLabel ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={onChangeAssignment}
                disabled={busy}
              >
                Change
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ConversationRow({
  conversation,
  agentLabel,
  cabinetName,
  onOpen,
}: {
  conversation: ConversationMeta;
  agentLabel: string;
  cabinetName: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="relative flex w-full items-start gap-2 border-b border-border/70 px-3 py-2 text-left transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="mt-0.5 shrink-0">
        <ConversationStatusIcon status={conversation.status} />
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
              TRIGGER_STYLES[conversation.trigger]
            )}
          >
            <TriggerIcon trigger={conversation.trigger} className="h-2.75 w-2.75" />
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <p className="truncate">
            {agentLabel}
            {cabinetName ? ` · ${cabinetName}` : ""}
          </p>
          <span className="shrink-0">{formatRelative(conversation.startedAt)}</span>
        </div>
      </div>
    </button>
  );
}

function BoardLane({
  lane,
  count,
  headerAction,
  emptyState,
  children,
}: {
  lane: BoardLane;
  count: number;
  headerAction?: ReactNode;
  emptyState: string;
  children: ReactNode;
}) {
  const copy = LANE_COPY[lane];
  const Icon = copy.icon;

  return (
    <section className="flex min-w-[300px] flex-1 flex-col overflow-hidden border-r border-border/70 bg-background last:border-r-0">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/30 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                "size-4 shrink-0 text-muted-foreground",
                lane === "running" && count > 0 && "animate-spin"
              )}
            />
            <h3 className="text-[14px] font-semibold text-foreground">{copy.title}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                copy.badge
              )}
            >
              {count}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{copy.description}</p>
        </div>

        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {count === 0 ? (
            <div className="px-3 py-8 text-[12px] leading-6 text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            <div>{children}</div>
          )}
        </ScrollArea>
      </div>
    </section>
  );
}

export function TasksBoard({
  cabinetPath,
  workspaceMode,
}: {
  cabinetPath?: string;
  workspaceMode?: "ops" | "cabinet";
} = {}) {
  const setSection = useAppStore((state) => state.setSection);
  const cabinetVisibilityModes = useAppStore((state) => state.cabinetVisibilityModes);
  const setCabinetVisibilityMode = useAppStore((state) => state.setCabinetVisibilityMode);
  const resolvedWorkspaceMode = workspaceMode || (cabinetPath ? "cabinet" : "ops");
  const effectiveCabinetPath = cabinetPath || ROOT_CABINET_PATH;
  const effectiveVisibilityMode: CabinetVisibilityMode =
    resolvedWorkspaceMode === "ops"
      ? "all"
      : cabinetVisibilityModes[effectiveCabinetPath] || "own";

  const [overview, setOverview] = useState<CabinetOverview | null>(null);
  const [drafts, setDrafts] = useState<HumanInboxDraft[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assignDraftId, setAssignDraftId] = useState<string | null>(null);
  const [assignBusyAction, setAssignBusyAction] = useState<"save" | "start" | null>(null);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("3");
  const [selectedAssignAgentId, setSelectedAssignAgentId] = useState<string | null>(null);
  const [selectedFilterAgentId, setSelectedFilterAgentId] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");

  const refreshOverview = useCallback(async () => {
    const params = new URLSearchParams({
      path: effectiveCabinetPath,
      visibility: effectiveVisibilityMode,
    });
    const response = await fetch(`/api/cabinets/overview?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load task scope");
    }
    const data = (await response.json()) as CabinetOverview;
    setOverview(data);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshDrafts = useCallback(async () => {
    const params = new URLSearchParams({
      cabinetPath: effectiveCabinetPath,
      visibilityMode: effectiveVisibilityMode,
    });
    const response = await fetch(`/api/agents/inbox-drafts?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load inbox drafts");
    }
    const data = await response.json();
    setDrafts((data.drafts || []) as HumanInboxDraft[]);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshConversations = useCallback(async () => {
    const params = new URLSearchParams({
      cabinetPath: effectiveCabinetPath,
      limit: "400",
    });
    if (effectiveVisibilityMode !== "own") {
      params.set("visibilityMode", effectiveVisibilityMode);
    }

    const response = await fetch(`/api/agents/conversations?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load conversations");
    }

    const data = await response.json();
    setConversations((data.conversations || []) as ConversationMeta[]);
  }, [effectiveCabinetPath, effectiveVisibilityMode]);

  const refreshBoard = useCallback(
    async (options?: { initial?: boolean }) => {
      const initial = options?.initial === true;
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        await Promise.all([refreshOverview(), refreshDrafts(), refreshConversations()]);
      } finally {
        if (initial) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [refreshConversations, refreshDrafts, refreshOverview]
  );

  useEffect(() => {
    void refreshBoard({ initial: true });
    const interval = window.setInterval(() => {
      void refreshBoard();
    }, 5000);
    const onFocus = () => void refreshBoard();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshBoard]);

  const visibleAgents = useMemo(() => overview?.agents || [], [overview]);

  useEffect(() => {
    if (
      selectedFilterAgentId !== "all" &&
      !visibleAgents.some((agent) => agent.scopedId === selectedFilterAgentId)
    ) {
      setSelectedFilterAgentId("all");
    }
  }, [selectedFilterAgentId, visibleAgents]);

  const activeAssignDraft = useMemo(
    () => drafts.find((draft) => draft.id === assignDraftId) || null,
    [assignDraftId, drafts]
  );

  useEffect(() => {
    if (!activeAssignDraft) {
      setSelectedAssignAgentId(null);
      return;
    }

    const existingAssignment = activeAssignDraft.assignedAgentSlug
      ? scopedAgentKey(
          activeAssignDraft.assignedAgentCabinetPath,
          activeAssignDraft.assignedAgentSlug
        )
      : null;

    if (
      existingAssignment &&
      visibleAgents.some((agent) => agent.scopedId === existingAssignment)
    ) {
      setSelectedAssignAgentId(existingAssignment);
      return;
    }

    const preferredAgent =
      visibleAgents.find((agent) => agent.cabinetDepth === 0 && agent.active) ||
      visibleAgents.find((agent) => agent.active) ||
      visibleAgents[0];

    setSelectedAssignAgentId(preferredAgent?.scopedId || null);
  }, [activeAssignDraft, visibleAgents]);

  const agentByKey = useMemo(
    () =>
      new Map(visibleAgents.map((agent) => [scopedAgentKey(agent.cabinetPath, agent.slug), agent])),
    [visibleAgents]
  );

  const selectedFilterAgent =
    selectedFilterAgentId === "all"
      ? null
      : visibleAgents.find((agent) => agent.scopedId === selectedFilterAgentId) || null;

  const filterAgentItems = useMemo(
    () => [
      { label: "All visible agents", value: "all" },
      ...visibleAgents.map((agent) => ({
        label: `${agent.name}${agent.cabinetName ? ` · ${agent.cabinetName}` : ""}`,
        value: agent.scopedId,
      })),
    ],
    [visibleAgents]
  );

  const scopeItems = useMemo(
    () =>
      CABINET_VISIBILITY_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    []
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      if (conversation.status === "cancelled") return false;
      if (
        selectedFilterAgentId !== "all" &&
        scopedAgentKey(conversation.cabinetPath, conversation.agentSlug) !== selectedFilterAgentId
      ) {
        return false;
      }
      if (triggerFilter !== "all" && conversation.trigger !== triggerFilter) {
        return false;
      }
      return true;
    });
  }, [conversations, selectedFilterAgentId, triggerFilter]);

  const groupedConversations = useMemo(
    () => ({
      running: filteredConversations.filter((conversation) => conversation.status === "running"),
      completed: filteredConversations.filter((conversation) => conversation.status === "completed"),
      failed: filteredConversations.filter((conversation) => conversation.status === "failed"),
    }),
    [filteredConversations]
  );

  const resolveAgentForDraft = useCallback(
    (draft: HumanInboxDraft): VisibleAgent | null => {
      if (!draft.assignedAgentSlug) return null;
      return (
        agentByKey.get(
          scopedAgentKey(draft.assignedAgentCabinetPath, draft.assignedAgentSlug)
        ) || null
      );
    },
    [agentByKey]
  );

  async function createDraft() {
    if (!title.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/agents/inbox-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority: Number(priority),
          cabinetPath: effectiveCabinetPath,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create inbox draft");
      }

      setTitle("");
      setDescription("");
      setPriority("3");
      setCreateDialogOpen(false);
      await refreshDrafts();
    } finally {
      setCreating(false);
    }
  }

  async function saveAssignment(
    draft: HumanInboxDraft,
    agent: VisibleAgent
  ): Promise<HumanInboxDraft> {
    const response = await fetch("/api/agents/inbox-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        draftId: draft.id,
        cabinetPath: draft.cabinetPath || effectiveCabinetPath,
        assignedAgentSlug: agent.slug,
        assignedAgentCabinetPath: agent.cabinetPath || effectiveCabinetPath,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to assign inbox draft");
    }

    const data = await response.json();
    return data.draft as HumanInboxDraft;
  }

  async function removeDraft(draft: HumanInboxDraft) {
    const response = await fetch("/api/agents/inbox-drafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftId: draft.id,
        cabinetPath: draft.cabinetPath || effectiveCabinetPath,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to remove inbox draft");
    }
  }

  async function startDraftConversation(draft: HumanInboxDraft, agent: VisibleAgent) {
    await saveAssignment(draft, agent);

    const response = await fetch("/api/agents/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentSlug: agent.slug,
        userMessage: draftPrompt(draft),
        cabinetPath: agent.cabinetPath || effectiveCabinetPath,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to start conversation from inbox draft");
    }

    await removeDraft(draft);
    await Promise.all([refreshDrafts(), refreshConversations()]);
  }

  async function handleSaveAssignment() {
    if (!activeAssignDraft || !selectedAssignAgentId) return;
    const agent = visibleAgents.find((entry) => entry.scopedId === selectedAssignAgentId) || null;
    if (!agent) return;

    setBusyDraftId(activeAssignDraft.id);
    setAssignBusyAction("save");
    try {
      await saveAssignment(activeAssignDraft, agent);
      setAssignDraftId(null);
      await refreshDrafts();
    } finally {
      setBusyDraftId(null);
      setAssignBusyAction(null);
    }
  }

  async function handleStartFromDialog() {
    if (!activeAssignDraft || !selectedAssignAgentId) return;
    const agent = visibleAgents.find((entry) => entry.scopedId === selectedAssignAgentId) || null;
    if (!agent) return;

    setBusyDraftId(activeAssignDraft.id);
    setAssignBusyAction("start");
    try {
      await startDraftConversation(activeAssignDraft, agent);
      setAssignDraftId(null);
    } finally {
      setBusyDraftId(null);
      setAssignBusyAction(null);
    }
  }

  async function handleStartAssignedDraft(draft: HumanInboxDraft) {
    const agent = resolveAgentForDraft(draft);
    if (!agent) return;

    setBusyDraftId(draft.id);
    try {
      await startDraftConversation(draft, agent);
    } finally {
      setBusyDraftId(null);
    }
  }

  function openConversation(conversation: ConversationMeta) {
    const targetCabinetPath = conversation.cabinetPath || effectiveCabinetPath;
    setSection({
      type: "agent",
      mode: "cabinet",
      slug: conversation.agentSlug,
      cabinetPath: targetCabinetPath,
      agentScopedId: `${targetCabinetPath}::agent::${conversation.agentSlug}`,
      conversationId: conversation.id,
    });
  }

  const cabinetName =
    overview?.cabinet.name ||
    (effectiveCabinetPath === ROOT_CABINET_PATH
      ? "Cabinet"
      : startCase(effectiveCabinetPath.split("/").pop()));
  const scopeLabel =
    CABINET_VISIBILITY_OPTIONS.find((option) => option.value === effectiveVisibilityMode)?.label ||
    "Own agents only";
  const boardTitle =
    resolvedWorkspaceMode === "cabinet" ? `${cabinetName} Task Board` : "All Cabinets Task Board";
  const runsLabel =
    triggerFilter === "all"
      ? `${filteredConversations.length} run${filteredConversations.length === 1 ? "" : "s"}`
      : triggerFilter === "job"
        ? `${filteredConversations.length} job run${filteredConversations.length === 1 ? "" : "s"}`
        : `${filteredConversations.length} ${triggerFilter} run${filteredConversations.length === 1 ? "" : "s"}`;
  const boardDescription = selectedFilterAgent
    ? `${drafts.length} inbox draft${drafts.length === 1 ? "" : "s"}. ${runsLabel} for ${selectedFilterAgent.name}.`
    : resolvedWorkspaceMode === "cabinet"
      ? `${scopeLabel}. ${drafts.length} inbox draft${drafts.length === 1 ? "" : "s"} and ${runsLabel} across ${visibleAgents.length} visible agent${visibleAgents.length === 1 ? "" : "s"}.`
      : `${drafts.length} inbox draft${drafts.length === 1 ? "" : "s"} and ${runsLabel} across ${visibleAgents.length} visible agent${visibleAgents.length === 1 ? "" : "s"} in all cabinets.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-background/95 px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <h1 className="font-body-serif text-[1.9rem] leading-none tracking-tight text-foreground sm:text-[2.2rem]">
            {boardTitle}
          </h1>
          <p className="pt-2 text-sm leading-6 text-muted-foreground">
            {boardDescription}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {TRIGGER_FILTERS.map((filter) => (
            <TriggerChip
              key={filter}
              filter={filter}
              active={triggerFilter === filter}
              onClick={() => setTriggerFilter(filter)}
            >
              {filter === "all" ? (
                "All"
              ) : filter === "manual" ? (
                <>
                  <TriggerIcon trigger="manual" className={cn("size-3", triggerFilter !== "manual" && "text-sky-400")} />
                  Manual
                </>
              ) : filter === "job" ? (
                <>
                  <TriggerIcon trigger="job" className={cn("size-3", triggerFilter !== "job" && "text-emerald-400")} />
                  Jobs
                </>
              ) : (
                <>
                  <TriggerIcon trigger="heartbeat" className={cn("size-3", triggerFilter !== "heartbeat" && "text-pink-400")} />
                  Heartbeat
                </>
              )}
            </TriggerChip>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Select
              items={filterAgentItems}
              value={selectedFilterAgentId}
              onValueChange={(value) =>
                setSelectedFilterAgentId(typeof value === "string" ? value : "all")
              }
            >
              <SelectTrigger size="sm" className="bg-background">
                <SelectValue placeholder="All visible agents" />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[280px]">
                <SelectGroup>
                  <SelectItem value="all">All visible agents</SelectItem>
                  {visibleAgents.map((agent) => (
                    <SelectItem key={agent.scopedId} value={agent.scopedId}>
                      <span className="text-sm leading-none">{agent.emoji || "🤖"}</span>
                      <span className="truncate">
                        {agent.name}
                        {agent.cabinetName ? ` · ${agent.cabinetName}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {resolvedWorkspaceMode === "cabinet" ? (
              <Select
                items={scopeItems}
                value={effectiveVisibilityMode}
                onValueChange={(value) =>
                  setCabinetVisibilityMode(
                    effectiveCabinetPath,
                    value as CabinetVisibilityMode
                  )
                }
              >
                <SelectTrigger size="sm" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    {CABINET_VISIBILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void refreshBoard()}
              disabled={refreshing}
            >
              <RefreshCw
                data-icon="inline-start"
                className={cn(refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <CreateDraftDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        priority={priority}
        onPriorityChange={setPriority}
        creating={creating}
        onSubmit={() => void createDraft()}
      />

      <AssignDraftDialog
        open={Boolean(activeAssignDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDraftId(null);
          }
        }}
        draft={activeAssignDraft}
        visibleAgents={visibleAgents}
        selectedAgentId={selectedAssignAgentId}
        onSelectedAgentIdChange={setSelectedAssignAgentId}
        busyAction={assignBusyAction}
        onSaveForLater={() => void handleSaveAssignment()}
        onStartNow={() => void handleStartFromDialog()}
      />

      <div className="min-h-0 flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the task board...
          </div>
        ) : (
          <div className="flex h-full min-w-max">
            <BoardLane
              lane="inbox"
              count={drafts.length}
              emptyState="No inbox tasks yet. Click Add to queue the next thing you want to execute."
              headerAction={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              }
            >
              {drafts.map((draft) => {
                const assignedAgent = resolveAgentForDraft(draft);
                const fallbackAssignedName = draft.assignedAgentSlug
                  ? startCase(draft.assignedAgentSlug)
                  : null;
                const assignedCabinetName = visibleAgentCabinetLabel(
                  assignedAgent,
                  draft.assignedAgentCabinetPath || draft.cabinetPath
                );

                return (
                  <DraftRow
                    key={`${draft.cabinetPath || ROOT_CABINET_PATH}::draft::${draft.id}`}
                    draft={draft}
                    assignedAgentLabel={assignedAgent?.name || fallbackAssignedName}
                    assignedCabinetLabel={assignedCabinetName}
                    canStartNow={Boolean(assignedAgent)}
                    busy={busyDraftId === draft.id}
                    onAssign={() => setAssignDraftId(draft.id)}
                    onChangeAssignment={() => setAssignDraftId(draft.id)}
                    onStartNow={() => void handleStartAssignedDraft(draft)}
                  />
                );
              })}
            </BoardLane>

            <BoardLane
              lane="running"
              count={groupedConversations.running.length}
              emptyState="Nothing is running right now."
            >
              {groupedConversations.running.map((conversation) => {
                const agent =
                  agentByKey.get(scopedAgentKey(conversation.cabinetPath, conversation.agentSlug)) ||
                  null;

                return (
                  <ConversationRow
                    key={buildConversationInstanceKey(conversation)}
                    conversation={conversation}
                    agentLabel={agent?.name || startCase(conversation.agentSlug)}
                    cabinetName={visibleAgentCabinetLabel(agent, conversation.cabinetPath)}
                    onOpen={() => openConversation(conversation)}
                  />
                );
              })}
            </BoardLane>

            <BoardLane
              lane="completed"
              count={groupedConversations.completed.length}
              emptyState="Completed runs will collect here as they finish."
            >
              {groupedConversations.completed.map((conversation) => {
                const agent =
                  agentByKey.get(scopedAgentKey(conversation.cabinetPath, conversation.agentSlug)) ||
                  null;

                return (
                  <ConversationRow
                    key={buildConversationInstanceKey(conversation)}
                    conversation={conversation}
                    agentLabel={agent?.name || startCase(conversation.agentSlug)}
                    cabinetName={visibleAgentCabinetLabel(agent, conversation.cabinetPath)}
                    onOpen={() => openConversation(conversation)}
                  />
                );
              })}
            </BoardLane>

            <BoardLane
              lane="failed"
              count={groupedConversations.failed.length}
              emptyState="Failed runs will surface here so they are easy to retry."
            >
              {groupedConversations.failed.map((conversation) => {
                const agent =
                  agentByKey.get(scopedAgentKey(conversation.cabinetPath, conversation.agentSlug)) ||
                  null;

                return (
                  <ConversationRow
                    key={buildConversationInstanceKey(conversation)}
                    conversation={conversation}
                    agentLabel={agent?.name || startCase(conversation.agentSlug)}
                    cabinetName={visibleAgentCabinetLabel(agent, conversation.cabinetPath)}
                    onOpen={() => openConversation(conversation)}
                  />
                );
              })}
            </BoardLane>
          </div>
        )}
      </div>
    </div>
  );
}
