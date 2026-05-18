"use client";

import { ArrowUpRight, Maximize, Minimize, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { TaskConversationPage } from "@/components/tasks/conversation/task-conversation-page";
import { TaskComposeBody } from "@/components/tasks/task-compose-body";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useSideDrawer } from "@/hooks/use-side-drawer";
import { Button } from "@/components/ui/button";
import { stopConversation } from "@/components/tasks/board/board-actions";
import { ProviderGlyph } from "@/components/agents/provider-glyph";
import { useProviderIcon } from "@/hooks/use-provider-icons";
import { formatEffortName } from "@/lib/agents/runtime-options";
import { useLocale } from "@/i18n/use-locale";
import type {
  ConversationMeta,
  ConversationStatus,
} from "@/types/conversations";
import type { TaskStatus } from "@/types/tasks";

function StatusDot({ status }: { status: ConversationStatus }) {
  if (status === "running") {
    return <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>;
  }
  if (status === "completed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />;
  }
  if (status === "failed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-destructive" />;
  }
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />;
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

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function readConversationModel(meta: Pick<ConversationMeta, "adapterConfig">): string | null {
  const config = meta.adapterConfig;
  if (!config || typeof config !== "object") return null;
  const model = config.model;
  return typeof model === "string" && model.trim() ? model.trim() : null;
}

function readConversationEffort(meta: Pick<ConversationMeta, "adapterConfig">): string | null {
  const config = meta.adapterConfig;
  if (!config || typeof config !== "object") return null;
  const effort =
    typeof config.effort === "string" && config.effort.trim()
      ? config.effort
      : typeof config.reasoningEffort === "string" && config.reasoningEffort.trim()
        ? config.reasoningEffort
        : null;

  return effort ? formatEffortName(effort) : null;
}

function formatProviderLabel(providerId?: string): string | null {
  if (!providerId) return null;

  return providerId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => {
      const upper = segment.toUpperCase();
      if (upper === "API" || upper === "CLI") return upper;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

function buildRuntimeLabel(
  meta: Pick<ConversationMeta, "adapterConfig" | "providerId">
): string | null {
  const model = readConversationModel(meta);
  const effort = readConversationEffort(meta);
  const provider = formatProviderLabel(meta.providerId);

  if (model && provider && effort) return `${model} · ${provider} · ${effort}`;
  if (model && provider) return `${model} · ${provider}`;
  if (model && effort) return `${model} · ${effort}`;
  if (model) return model;
  if (provider && effort) return `${provider} · ${effort}`;
  if (provider) return `${provider} · default model`;
  return null;
}

export function TaskDetailPanel() {
  const { t } = useLocale();
  const conversation = useAppStore((s) => s.taskPanelConversation);
  const setSection = useAppStore((s) => s.setSection);
  const fullscreen = useAppStore((s) => s.taskPanelFullscreen);
  const toggleFullscreen = useAppStore((s) => s.toggleTaskPanelFullscreen);
  const taskPanelOpen = useAppStore((s) => s.taskPanelOpen);
  const taskPanelMode = useAppStore((s) => s.taskPanelMode);
  const composeContext = useAppStore((s) => s.taskPanelComposeContext);
  const closeTaskPanel = useAppStore((s) => s.closeTaskPanel);
  const providerIcon = useProviderIcon(conversation?.providerId);
  const drawer = useSideDrawer({
    isOpen: taskPanelOpen,
    storageKey: "cabinet-task-panel-width",
  });

  // Mirror the summary's collapse-on-scroll: once the body scrolls past the
  // top, the header drops its meta row and ellipsises the title. Scroll
  // doesn't bubble, so a capture-phase listener on the panel root catches
  // scrolling inside the conversation. Callback ref so it binds when the
  // node actually mounts.
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [stopping, setStopping] = useState(false);
  // SSE-fresh status from the embedded TaskConversationPage. The store's
  // `conversation` is a snapshot frozen when the panel opened, so it can't
  // tell us a turn started running afterwards — this can.
  const [livePhase, setLivePhase] = useState<TaskStatus | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const setPanelScrollRoot = useCallback((node: HTMLDivElement | null) => {
    scrollCleanupRef.current?.();
    scrollCleanupRef.current = null;
    if (!node) return;
    let raf = 0;
    const onScroll = (e: Event) => {
      const tgt = e.target as HTMLElement | null;
      if (!tgt || typeof tgt.scrollTop !== "number") return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setHeaderCollapsed(tgt.scrollTop > 24);
      });
    };
    node.addEventListener("scroll", onScroll, { capture: true, passive: true });
    scrollCleanupRef.current = () => {
      node.removeEventListener("scroll", onScroll, { capture: true });
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Drop stale live status when the panel switches to another task; the
  // freshly-mounted TaskConversationPage re-emits its own.
  const conversationId = conversation?.id ?? null;
  useEffect(() => {
    setLivePhase(null);
  }, [conversationId]);

  if (!drawer.shouldRender) return null;

  const isCompose = taskPanelMode === "compose" || !conversation;

  const openFullPage = () => {
    if (!conversation) return;
    closeTaskPanel();
    setSection({
      type: "task",
      taskId: conversation.id,
      cabinetPath: conversation.cabinetPath,
    });
  };

  const runtimeLabel = conversation ? buildRuntimeLabel(conversation) : null;
  const errorKind = conversation?.errorKind;

  // Stop is only meaningful while the model is actively generating. Prefer
  // the SSE-fresh status from the embedded page (`"awaiting-input"` is its
  // own status, so `"running"` is true only mid-generation); fall back to
  // the store snapshot until the first live event arrives.
  const llmRunning =
    livePhase !== null
      ? livePhase === "running"
      : conversation?.status === "running" && !conversation.awaitingInput;

  const collapsed = headerCollapsed;

  // Order: expand (full viewer) · fullscreen toggle · close. Shared by the
  // compose and conversation header variants.
  const actions = (
    <div className="ms-auto flex shrink-0 items-center gap-1">
      {!isCompose && conversation && llmRunning ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-[11px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          disabled={stopping}
          onClick={async () => {
            try {
              setStopping(true);
              await stopConversation(conversation.id, conversation.cabinetPath);
            } catch (e) {
              console.error("[task-panel] stop failed", e);
            } finally {
              setStopping(false);
            }
          }}
          title={t("tasks:conversation.sendSigterm")}
        >
          <Square className="size-3 fill-current" />
          Stop
        </Button>
      ) : null}
      {!isCompose && conversation ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
          onClick={openFullPage}
          title={t("tinyExtras:openFullTaskViewer")}
        >
          <ArrowUpRight className="size-3.5" />
        </Button>
      ) : null}
      {!drawer.isMobile ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
          onClick={toggleFullscreen}
          title={fullscreen ? "Shrink" : "Enlarge"}
        >
          {fullscreen ? (
            <Minimize className="size-3.5" />
          ) : (
            <Maximize className="size-3.5" />
          )}
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0"
        onClick={closeTaskPanel}
      >
        <X className="size-4" />
      </Button>
    </div>
  );

  const ease = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  const header = (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border/70 px-4 shrink-0 transition-[padding]",
        ease,
        collapsed ? "py-2" : "py-3"
      )}
    >
      {isCompose || !conversation ? (
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            New task
          </p>
          {actions}
        </div>
      ) : (
        <>
          {/* Row 1: status circle · model icon · model string · actions */}
          <div className="flex items-center gap-2">
            <StatusDot status={conversation.status} />
            {providerIcon ? (
              <div
                className="flex size-4 shrink-0 items-center justify-center rounded border border-border/60 bg-muted/30"
                title={providerIcon.name}
              >
                <ProviderGlyph
                  icon={providerIcon.icon}
                  asset={providerIcon.iconAsset}
                  className="h-2.5 w-2.5"
                />
              </div>
            ) : null}
            <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
              {runtimeLabel}
            </p>
            {actions}
          </div>

          {/* Row 2: agent · relative time — smoothly collapses its height
              away (grid 0fr↔1fr + fade) instead of popping. */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity]",
              ease,
              collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            )}
          >
            <p
              dir="auto"
              className="min-h-0 overflow-hidden truncate text-[11px] text-muted-foreground"
            >
              {startCase(conversation.agentSlug)}
              {" · "}
              {formatRelative(conversation.startedAt)}
              {errorKind ? (
                <span className="ml-1.5 rounded-sm bg-destructive/10 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-destructive">
                  {errorKind.replace(/_/g, " ")}
                </span>
              ) : null}
            </p>
          </div>

          {/* Row 3: title — wraps when expanded, eases down to a one-line
              ellipsis when collapsed (max-height tween). */}
          <p
            dir="auto"
            className={cn(
              "overflow-hidden text-[14px] font-semibold leading-snug text-foreground transition-[max-height]",
              ease,
              collapsed
                ? "max-h-[1.5rem] truncate"
                : "max-h-[12rem] whitespace-normal"
            )}
          >
            {conversation.title}
          </p>
        </>
      )}
    </div>
  );

  const body =
    isCompose || !conversation ? (
      <TaskComposeBody context={composeContext} />
    ) : (
      <div className="flex-1 overflow-hidden">
        <TaskConversationPage
          taskId={conversation.id}
          variant="compact"
          onLiveStatusChange={setLivePhase}
          returnContext={{
            type: "task",
            taskId: conversation.id,
            cabinetPath: conversation.cabinetPath,
          }}
        />
      </div>
    );

  const content = (
    <div
      ref={setPanelScrollRoot}
      className="flex min-h-0 flex-1 flex-col"
    >
      {header}
      {body}
    </div>
  );

  // Fullscreen is a separate overlay layout — bypass the drawer width-tween.
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {content}
      </div>
    );
  }

  return (
    <SideDrawer drawer={drawer} onScrimClick={closeTaskPanel}>
      {content}
    </SideDrawer>
  );
}
