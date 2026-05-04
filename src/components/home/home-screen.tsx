"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { selectDaemonLevel, useHealthStore } from "@/stores/health-store";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { fetchCabinetOverviewClient } from "@/lib/cabinets/overview-client";
import { cn } from "@/lib/utils";
import { flattenTree } from "@/lib/tree-utils";
import { createConversation } from "@/lib/agents/conversation-client";
import { ComposerInput } from "@/components/composer/composer-input";
import {
  AgentPicker,
  type AgentPickerOption,
} from "@/components/composer/agent-picker";
import {
  TaskRuntimePicker,
  type TaskRuntimeSelection,
} from "@/components/composer/task-runtime-picker";
import {
  StartWorkDialog,
  WhenChip,
  type StartWorkMode,
} from "@/components/composer/start-work-dialog";
import { useComposer, type MentionableItem } from "@/hooks/use-composer";
import { useSkillMentionItems } from "@/hooks/use-skill-mention-items";
import { useComposerAttachments } from "@/components/composer/use-composer-attachments";
import type { CabinetAgentSummary } from "@/types/cabinets";
import { OptaleBrainPanel } from "@/components/optale/brain-panel";
import { OptaleMcpOversightPanel } from "@/components/optale/mcp-oversight-panel";
import { OptaleMcpClientsPanel } from "@/components/optale/mcp-clients-panel";

type QuickAction = {
  label: string;
  prompt: string;
  // For delegation chips: ordered list of preferred dispatcher slugs. The
  // first one that exists in the user's cabinet is used; if none exist, the
  // chip is hidden so we never ship a "showcase" that silently routes to a
  // non-dispatcher (e.g. editor) and quietly degrades to a solo task.
  // Solo chips omit this field and use the composer's default routing.
  preferredAgents?: string[];
};

// Common dispatch-enabled lead slugs. Per
// `data/getting-started/delegating-between-agents`, leads default to
// canDispatch:true. We try them in order; the first one present wins.
const LEAD_FALLBACKS = ["ceo", "cto", "pm"];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Review customer rollout risks",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Review the current customer rollout materials, identify the top risks, cite the relevant sources, and draft a concise action plan for operator review.",
  },
  {
    label: "Create weekly operator briefing",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Draft a weekly operator briefing from recent tasks, source updates, object activity, and action queues. Highlight blockers, pending approvals, and next governed actions.",
  },
  {
    label: "Find accounts missing next action",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Inspect the business workspace for account or opportunity records that need a next action before Friday. Summarize findings and propose follow-ups without writing external systems.",
  },
  {
    label: "Prepare approval queue",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Review pending actions, group them by risk and owner, attach source evidence where available, and prepare an approval queue for the operator.",
  },
  {
    label: "Map source evidence",
    prompt:
      "Map the most relevant source files, notes, and records for the current workspace. Explain which sources support which business objects or action decisions.",
  },
  {
    label: "Summarize recent work",
    prompt:
      "Read the most recently modified workspace pages and task records. Group recent work by business theme, identify open threads, and draft a concise source-backed summary.",
  },
  {
    label: "Draft partner follow-up",
    prompt:
      "Draft a clear partner follow-up that summarizes current status, open asks, risks, and next steps. Keep it business-facing and avoid internal diagnostic details.",
  },
  {
    label: "Inspect object relationships",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Inspect the current object registry relationships for accounts, people, projects, tasks, sources, policies, and actions. Summarize gaps or suspicious relationships.",
  },
  {
    label: "Draft compliance evidence note",
    preferredAgents: LEAD_FALLBACKS,
    prompt:
      "Draft a compliance evidence note for the current workspace. Include what is known, what still needs proof, and which governed actions require review.",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const setSection = useAppStore((s) => s.setSection);
  const treeNodes = useTreeStore((s) => s.nodes);
  const [userName, setUserName] = useState<string | null>(null);
  const [agents, setAgents] = useState<CabinetAgentSummary[]>([]);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffMode, setHandoffMode] = useState<StartWorkMode>("recurring");
  const [taskRuntime, setTaskRuntime] = useState<TaskRuntimeSelection>({});
  const [quickRunning, setQuickRunning] = useState(false);
  // Hold the chip row until the agents fetch has settled — only then do we
  // know which delegation chips to show. Animating before that point causes
  // the second wave of chips to pop in at scrambled positions and reflow the
  // layout. The 2.5s timeout is a safety net for a hung request; in practice
  // the local overview fetch settles in under 200ms.
  const [chipsReady, setChipsReady] = useState(false);
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        const profileName: string | undefined =
          data?.profile?.displayName || data?.profile?.name;
        if (profileName) {
          setUserName(profileName);
        }
      })
      .catch(() => {});

    fetchCabinetOverviewClient(".", "all")
      .then((data) => {
        setAgents((data?.agents || []) as CabinetAgentSummary[]);
      })
      .catch(() => {})
      .finally(() => setChipsReady(true));

    const safetyTimer = setTimeout(() => setChipsReady(true), 2500);
    return () => clearTimeout(safetyTimer);
  }, []);

  const skillItems = useSkillMentionItems();

  const mentionItems: MentionableItem[] = [
    ...agents
      .filter((a) => a.slug !== "editor")
      .map((a) => ({
        type: "agent" as const,
        id: a.slug,
        label: a.name,
        sublabel: a.role || "",
        icon: a.emoji,
      })),
    ...skillItems,
    ...flattenTree(treeNodes).map((p) => ({
      type: "page" as const,
      id: p.path,
      label: p.title,
      sublabel: p.path,
    })),
  ];

  const stagingClientUuid = useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}`,
    []
  );
  const attachments = useComposerAttachments({
    // Home-screen has no cabinet context — attachments land at the root
    // cabinet (data/.agents/.conversations/_pending/...).
    cabinetPath: undefined,
    clientAttachmentId: stagingClientUuid,
  });

  const composer = useComposer({
    items: mentionItems,
    attachments,
    stagingClientUuid,
    onSubmit: async ({
      message,
      mentionedPaths,
      mentionedAgents,
      mentionedSkills,
      attachmentPaths,
      stagingClientUuid: turnStagingUuid,
    }) => {
      // v0.4.1 dispatch priority: explicitly-selected picker agent →
      // first @-mentioned agent → "editor" fallback. The picker overrides
      // mentions because the user just clicked it.
      const targetAgent =
        selectedAgentSlug ??
        (mentionedAgents.length > 0 ? mentionedAgents[0] : "editor");

      const data = await createConversation({
        agentSlug: targetAgent,
        userMessage: message,
        mentionedPaths,
        mentionedSkills,
        attachmentPaths,
        stagingClientUuid: turnStagingUuid,
        ...taskRuntime,
      });
      setSection({
        type: "conversation",
        conversationId: data.conversation?.id,
        cabinetPath: ROOT_CABINET_PATH,
      });
    },
  });

  // v0.4.1: chips ignore each action's preferredAgents and dispatch via a
  // single priority: user-picked agent → editor (if installed) → first
  // installed agent → null (fall through to composer.submit, which then
  // routes via its own onSubmit priority).
  const pickDispatcher = (): string | null => {
    if (selectedAgentSlug) return selectedAgentSlug;
    const slugs = new Set(agents.map((a) => a.slug));
    if (slugs.has("editor")) return "editor";
    return agents[0]?.slug ?? null;
  };

  // All chips render. Delegation chips that don't have any installed agent
  // to dispatch to fall through to composer.submit, which currently routes
  // to "editor" — that path may surface a clearer error on agent-less
  // cabinets but doesn't silently drop the click.
  const visibleActions = QUICK_ACTIONS;

  // Build options for the home-composer agent picker. Prepended "Auto"
  // sentinel (empty slug) clears `selectedAgentSlug` so the cascade kicks in.
  const agentPickerOptions: AgentPickerOption[] = [
    {
      slug: "",
      name: "Auto",
      role: "best available role",
    } as AgentPickerOption,
    ...(agents as AgentPickerOption[]),
  ];

  const runQuickAction = async (action: QuickAction) => {
    if (composer.submitting || quickRunning) return;
    const dispatcher = pickDispatcher();
    if (!dispatcher) {
      void composer.submit(action.prompt);
      return;
    }
    setQuickRunning(true);
    try {
      const data = await createConversation({
        agentSlug: dispatcher,
        userMessage: action.prompt,
        mentionedPaths: [],
        attachmentPaths: [],
        ...taskRuntime,
      });
      if (data.conversation?.id) {
        setSection({
          type: "conversation",
          conversationId: data.conversation.id,
          cabinetPath: ROOT_CABINET_PATH,
        });
      }
    } catch {
      // Best-effort: chip clicks fail silently; the composer stays interactive.
    } finally {
      setQuickRunning(false);
    }
  };

  const greeting = getGreeting();
  const headline = userName ? `${greeting}, ${userName}.` : `${greeting}.`;

  // Daemon owns agent execution — if it's confirmed down (≥2 missed polls)
  // disable the prompt and surface why, instead of letting the user fire a
  // request that will silently fail.
  const daemonLevel = useHealthStore(selectDaemonLevel);
  const daemonDown = daemonLevel === "down";
  const composerPlaceholder = daemonDown
    ? "Agent daemon offline — restart to send"
    : "Ask Command to review, draft, inspect, or prepare an action...";

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-7">
      <div className="flex min-h-[44vh] w-full max-w-3xl flex-col items-center justify-center space-y-7">
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Optale Command
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-normal">
            {headline}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground">
            Start from chat, then turn useful work into tracked tasks, source-backed
            object updates, or governed actions for review.
          </p>
        </div>

        <ComposerInput
          composer={composer}
          placeholder={composerPlaceholder}
          variant="card"
          items={mentionItems}
          attachments={attachments}
          autoFocus
          disabled={daemonDown}
          className="w-full"
          minHeight="44px"
          maxHeight="160px"
          mentionDropdownPlacement="below"
          topRightOverlay={
            <WhenChip
              mode="now"
              // Audit #020: home-screen composer has no agent context yet,
              // so "Heartbeat" doesn't apply. Surface it only on agent
              // detail / mid-conversation composers.
              allowHeartbeat={false}
              onChange={(next) => {
                if (next === "now") return;
                setHandoffMode(next);
                setHandoffOpen(true);
              }}
            />
          }
          actionsStart={
            <div className="flex items-center gap-1.5">
              <AgentPicker
                agents={agentPickerOptions}
                selectedSlug={selectedAgentSlug ?? ""}
                onSelect={(slug) =>
                  setSelectedAgentSlug(slug === "" ? null : slug)
                }
              />
              <TaskRuntimePicker
                value={taskRuntime}
                onChange={setTaskRuntime}
              />
            </div>
          }
        />

        <div className="grid w-full gap-2 sm:grid-cols-3">
          {[
            {
              label: "Objects",
              detail: "Inspect OAG records and relationships",
              type: "resources" as const,
            },
            {
              label: "Actions",
              detail: "Review queues, policy, lineage, and audit",
              type: "actions" as const,
            },
            {
              label: "Observatory",
              detail: "Brain, memory, graph, sources, and traces",
              type: "brain" as const,
            },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() =>
                setSection({
                  type: item.type,
                  cabinetPath: ROOT_CABINET_PATH,
                })
              }
              className="rounded-md border border-border/70 bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span className="block text-[13px] font-semibold text-foreground">
                {item.label}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                {item.detail}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-start justify-center content-start gap-1.5 min-h-[7rem]">
          {chipsReady &&
            visibleActions.map((action, index) => {
              const disabled = composer.submitting || quickRunning || daemonDown;
              return (
                <button
                  key={action.label}
                  onClick={() => void runQuickAction(action)}
                  disabled={disabled}
                  title={action.prompt}
                  style={{
                    fontFamily:
                      "var(--font-heading-theme, var(--font-theme, var(--font-sans)))",
                    animationDelay: `${Math.min(index, 12) * 50}ms`,
                    animationFillMode: "backwards",
                  }}
                  className={cn(
                    "rounded-full border border-border/70 bg-card/80 px-3 py-1",
                    "text-xs text-foreground/85",
                    "hover:bg-secondary hover:border-border hover:text-foreground",
                    "transition-colors",
                    "animate-in fade-in slide-in-from-top-1 duration-200 ease-out",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {action.label}
                </button>
              );
            })}
        </div>
      </div>

      <section className="w-full max-w-6xl pb-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-normal text-foreground">
              Operating visibility
            </h2>
            <p className="text-xs text-muted-foreground">
              Brain, MCP oversight, and client access for the active Command workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Brain", type: "brain" as const },
              { label: "Vault", type: "vault" as const },
              { label: "Entities", type: "entities" as const },
              { label: "Inspect", type: "resources" as const },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() =>
                  setSection({
                    type: item.type,
                    cabinetPath: ROOT_CABINET_PATH,
                  })
                }
                className="rounded-md border border-border/70 bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <OptaleBrainPanel cabinetPath={ROOT_CABINET_PATH} />
          <OptaleMcpOversightPanel
            cabinetPath={ROOT_CABINET_PATH}
            visibilityMode="all"
          />
          <OptaleMcpClientsPanel cabinetPath={ROOT_CABINET_PATH} />
        </div>
      </section>

      <StartWorkDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        cabinetPath={ROOT_CABINET_PATH}
        agents={agents}
        initialMode={handoffMode}
        initialPrompt={composer.input}
        onStarted={(conversationId) => {
          composer.reset();
          setSection({
            type: "conversation",
            conversationId,
            cabinetPath: ROOT_CABINET_PATH,
          });
        }}
      />
    </div>
  );
}
