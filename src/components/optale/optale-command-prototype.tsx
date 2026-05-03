"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  Bot,
  Boxes,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardList,
  Clock3,
  Database,
  Eye,
  FileText,
  GitBranch,
  Home,
  KeyRound,
  ListChecks,
  MessageSquare,
  Network,
  PanelRight,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  TerminalSquare,
  UserPlus,
  Users,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PrototypeSurface = "workbench" | "brain" | "agents";
type Drawer = "data" | "agents" | "tasks";
type InspectorTab = "summary" | "evidence" | "trace" | "policy";
type BrainMode = "overview" | "objects" | "actions" | "sources";

type NavItem = {
  id: PrototypeSurface;
  label: string;
  icon: LucideIcon;
};

type DrawerItem = {
  label: string;
  meta: string;
  icon: LucideIcon;
  active?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "workbench", label: "Workbench", icon: Home },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "agents", label: "Agents", icon: Users },
];

const DATA_ITEMS: DrawerItem[] = [
  { label: "Company Brain", meta: "space", icon: Archive, active: true },
  { label: "Vault", meta: "files and notes", icon: FileText },
  { label: "CRM Objects", meta: "object set", icon: Boxes },
  { label: "Source Inbox", meta: "12 pending", icon: Database },
];

const AGENT_ITEMS: DrawerItem[] = [
  { label: "Operator", meta: "ready", icon: Bot, active: true },
  { label: "Research", meta: "ready", icon: Search },
  { label: "Builder", meta: "idle", icon: Workflow },
  { label: "Reviewer", meta: "approval", icon: ShieldCheck },
];

const TASK_ITEMS: DrawerItem[] = [
  { label: "Approve CRM merge", meta: "needs review", icon: ListChecks, active: true },
  { label: "Map sales source", meta: "running", icon: GitBranch },
  { label: "Clean stale contacts", meta: "queued", icon: Clock3 },
];

const OBJECT_TYPES = [
  { name: "Account", count: "126", state: "healthy" },
  { name: "Person", count: "842", state: "healthy" },
  { name: "Opportunity", count: "48", state: "mapping" },
  { name: "Conversation", count: "1.9k", state: "indexed" },
];

const OBJECT_SETS = [
  { name: "Warm enterprise opportunities", count: "18 objects", owner: "Operator" },
  { name: "Contacts without next action", count: "71 objects", owner: "Reviewer" },
  { name: "Open source mapping gaps", count: "9 objects", owner: "Builder" },
];

const SOURCES = [
  { name: "Vault", state: "Ready", detail: "324 files indexed" },
  { name: "Action Graph", state: "Ready", detail: "414 nodes, 425 links" },
  { name: "Graphiti Memory", state: "Empty", detail: "connected, no episodes" },
  { name: "CRM Bridge", state: "Review", detail: "12 mappings pending" },
];

const AGENTS = [
  { name: "Operator", role: "daily command", status: "Ready", accent: "bg-emerald-500" },
  { name: "Research", role: "source and market work", status: "Ready", accent: "bg-sky-500" },
  { name: "Builder", role: "schemas and workflows", status: "Idle", accent: "bg-violet-500" },
  { name: "Reviewer", role: "approval and policy", status: "Watching", accent: "bg-amber-500" },
];

export function OptaleCommandPrototype({
  initialSurface = "workbench",
}: {
  initialSurface?: PrototypeSurface;
}) {
  const [surface, setSurface] = useState<PrototypeSurface>(initialSurface);
  const [drawer, setDrawer] = useState<Drawer>("data");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("summary");
  const [brainMode, setBrainMode] = useState<BrainMode>("overview");
  const drawerItems = useMemo(() => {
    if (drawer === "agents") return AGENT_ITEMS;
    if (drawer === "tasks") return TASK_ITEMS;
    return DATA_ITEMS;
  }, [drawer]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <PrototypeSidebar
          surface={surface}
          onSurfaceChange={setSurface}
          drawer={drawer}
          onDrawerChange={setDrawer}
          drawerItems={drawerItems}
        />

        <section className="flex min-w-0 flex-1 flex-col border-t border-border/70 lg:border-l lg:border-t-0">
          <PrototypeHeader surface={surface} />
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {surface === "workbench" ? (
                <WorkbenchSurface onInspect={setInspectorTab} />
              ) : null}
              {surface === "brain" ? (
                <BrainSurface
                  mode={brainMode}
                  onModeChange={setBrainMode}
                  onInspect={setInspectorTab}
                />
              ) : null}
              {surface === "agents" ? (
                <AgentsSurface onInspect={setInspectorTab} />
              ) : null}
            </div>
            <InspectorPanel
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              surface={surface}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function PrototypeSidebar({
  surface,
  onSurfaceChange,
  drawer,
  onDrawerChange,
  drawerItems,
}: {
  surface: PrototypeSurface;
  onSurfaceChange: (surface: PrototypeSurface) => void;
  drawer: Drawer;
  onDrawerChange: (drawer: Drawer) => void;
  drawerItems: DrawerItem[];
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-sidebar lg:h-screen lg:w-[292px]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className="group -ml-1 flex min-w-0 items-baseline gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <span className="font-logo text-[22px] italic leading-none text-sidebar-foreground">
            cabinet
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            Optale Command
          </span>
        </button>
        <Button variant="ghost" size="icon-sm" aria-label="Settings">
          <Settings className="size-3.5" />
        </Button>
      </div>

      <nav className="space-y-1 border-b border-sidebar-border/70 px-2 pb-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = surface === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSurfaceChange(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="rounded-lg bg-muted/60 px-2.5 py-1.5 ring-1 ring-border/60">
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2 text-left"
          >
            <Archive className="size-[18px] shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
              Thor / Optale
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Space drawers"
          className="mx-[9px] grid grid-cols-3 gap-1 rounded-b-lg border border-border/60 bg-muted/40 p-1 pt-2"
        >
          <DrawerTab
            active={drawer === "data"}
            label="Data"
            icon={FileText}
            addIcon={Plus}
            onClick={() => onDrawerChange("data")}
          />
          <DrawerTab
            active={drawer === "agents"}
            label="Agents"
            icon={Users}
            addIcon={UserPlus}
            onClick={() => onDrawerChange("agents")}
          />
          <DrawerTab
            active={drawer === "tasks"}
            label="Tasks"
            icon={SquareKanban}
            addIcon={Plus}
            onClick={() => onDrawerChange("tasks")}
          />
        </div>

        <div className="mt-2 space-y-1">
          {drawerItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={`${drawer}-${item.label}`}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] transition-colors",
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/75 hover:bg-foreground/[0.03] hover:text-foreground"
                )}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {item.meta}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-sidebar-border/70 p-2">
        <Button variant="ghost" size="sm" className="flex-1 justify-start text-[11px]">
          <Plus className="size-3.5" />
          New
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Open terminal">
          <TerminalSquare className="size-3.5" />
        </Button>
      </div>
    </aside>
  );
}

function DrawerTab({
  active,
  label,
  icon: Icon,
  addIcon: AddIcon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  addIcon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={cn(
          "relative flex w-full flex-col items-center gap-0.5 rounded-md px-1.5 pb-2 pt-3 transition-all",
          active
            ? "-translate-y-px bg-background text-foreground shadow-sm ring-1 ring-border/70"
            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 top-1 h-[2px] w-4 -translate-x-1/2 rounded-full",
            active ? "bg-amber-400/50" : "bg-muted-foreground/30"
          )}
        />
        <Icon className="size-[18px]" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em]">
          {label}
        </span>
      </button>
      {active ? (
        <button
          type="button"
          aria-label={`Add ${label}`}
          className="absolute right-1 top-1 inline-flex size-4 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <AddIcon className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function PrototypeHeader({ surface }: { surface: PrototypeSurface }) {
  const title =
    surface === "brain"
      ? "Brain"
      : surface === "agents"
        ? "Agents"
        : "Workbench";
  const eyebrow =
    surface === "brain"
      ? "Operating map"
      : surface === "agents"
        ? "Roster and conversations"
        : "Command cockpit";

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-background/95 px-4 py-2.5 sm:px-6">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="truncate text-[14px] font-semibold tracking-normal text-foreground">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CountPill label="objects" value="1.4k" />
        <CountPill label="actions" value="32" />
        <CountPill label="sources" value="8" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Search className="size-3.5" />
          Search
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Open inspector">
          <PanelRight className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}

function WorkbenchSurface({
  onInspect,
}: {
  onInspect: (tab: InspectorTab) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <section className="mb-7">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ContextChip icon={Archive} label="Thor / Optale" />
            <ContextChip icon={Boxes} label="Warm enterprise opportunities" />
            <ContextChip icon={ShieldCheck} label="approval required" />
          </div>
          <CommandComposer />
          <div className="flex flex-wrap justify-center gap-1.5">
            <QuietAction icon={Sparkles} label="Summarize state" />
            <QuietAction icon={Waypoints} label="Find next actions" />
            <QuietAction icon={ListChecks} label="Prepare approval" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="space-y-5">
          <SectionHeader title="Active work" meta="3 threads" />
          <div className="grid gap-3 md:grid-cols-3">
            <WorkCard
              icon={MessageSquare}
              title="Conversation"
              label="Manual chat"
              body="Review warm opportunities and draft the next operator brief."
              active
            />
            <WorkCard
              icon={ClipboardList}
              title="Task"
              label="Board item"
              body="Approve CRM merge after Reviewer validates mapped fields."
            />
            <WorkCard
              icon={Workflow}
              title="Action run"
              label="Governed action"
              body="Map 12 source records into Account and Person objects."
            />
          </div>

          <SectionHeader title="Current object set" meta="18 objects" />
          <div className="rounded-md border border-border bg-card">
            <div className="grid gap-px bg-border/70 md:grid-cols-3">
              {OBJECT_SETS.map((set) => (
                <button
                  key={set.name}
                  type="button"
                  onClick={() => onInspect("evidence")}
                  className="bg-card p-3 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 truncate text-[13px] font-medium">
                      {set.name}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{set.count}</span>
                    <span>{set.owner}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <SectionHeader title="Next decisions" meta="approval queue" />
          <div className="space-y-2">
            <DecisionRow
              title="CRM merge"
              detail="12 records, 2 conflicts"
              tone="amber"
              onInspect={() => onInspect("policy")}
            />
            <DecisionRow
              title="Source promotion"
              detail="Vault to company brain"
              tone="green"
              onInspect={() => onInspect("trace")}
            />
            <DecisionRow
              title="Graphiti memory"
              detail="connected, no episodes"
              tone="neutral"
              onInspect={() => onInspect("summary")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function BrainSurface({
  mode,
  onModeChange,
  onInspect,
}: {
  mode: BrainMode;
  onModeChange: (mode: BrainMode) => void;
  onInspect: (tab: InspectorTab) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SegmentedButton
          active={mode === "overview"}
          icon={Network}
          label="Overview"
          onClick={() => onModeChange("overview")}
        />
        <SegmentedButton
          active={mode === "objects"}
          icon={Boxes}
          label="Objects"
          onClick={() => onModeChange("objects")}
        />
        <SegmentedButton
          active={mode === "actions"}
          icon={Workflow}
          label="Actions"
          onClick={() => onModeChange("actions")}
        />
        <SegmentedButton
          active={mode === "sources"}
          icon={Database}
          label="Sources"
          onClick={() => onModeChange("sources")}
        />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <SectionHeader title="Operating map" meta="Action Graph source" />
          <ObjectMap onInspect={() => onInspect("evidence")} />
          <div className="grid gap-3 md:grid-cols-2">
            {OBJECT_TYPES.map((type) => (
              <button
                key={type.name}
                type="button"
                onClick={() => onInspect("summary")}
                className="rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Boxes className="size-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-medium">{type.name}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {type.state}
                  </span>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-normal">
                  {type.count}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <SectionHeader title="Sources" meta="progressive detail" />
          <div className="rounded-md border border-border bg-card">
            {SOURCES.map((source, index) => (
              <button
                key={source.name}
                type="button"
                onClick={() =>
                  onInspect(source.state === "Empty" ? "trace" : "summary")
                }
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30",
                  index > 0 && "border-t border-border/70"
                )}
              >
                <StatusDot state={source.state} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {source.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {source.detail}
                  </span>
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>

          <SectionHeader title="Management" meta="later layer" />
          <div className="grid gap-2">
            <ManagementRow icon={Boxes} title="Object types" detail="schema, properties, links" />
            <ManagementRow icon={Workflow} title="Action types" detail="verbs, criteria, approvals" />
            <ManagementRow icon={KeyRound} title="Policies" detail="access, write gates, denials" />
          </div>
        </div>
      </section>
    </div>
  );
}

function AgentsSurface({
  onInspect,
}: {
  onInspect: (tab: InspectorTab) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <SectionHeader title="AI team" meta="4 agents" />
          <div className="rounded-md border border-border bg-card">
            {AGENTS.map((agent, index) => (
              <button
                key={agent.name}
                type="button"
                onClick={() => onInspect("summary")}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30",
                  index > 0 && "border-t border-border/70"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-white",
                    agent.accent
                  )}
                >
                  <Bot className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {agent.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {agent.role}
                  </span>
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {agent.status}
                </span>
              </button>
            ))}
          </div>

          <details className="rounded-md border border-border bg-card p-3">
            <summary className="cursor-pointer text-[13px] font-medium">
              Agent harness
            </summary>
            <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
              <HarnessRow label="Provider" value="Claude Code" />
              <HarnessRow label="Model route" value="Sonnet, fallback OpenRouter" />
              <HarnessRow label="MCP policy" value="read default, write by approval" />
              <HarnessRow label="Artifacts" value="logs, diffs, traces" />
            </div>
          </details>
        </div>

        <div className="space-y-5">
          <SectionHeader title="Conversation" meta="manual chat" />
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border/70 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <ContextChip icon={MessageSquare} label="Conversation" />
                <ContextChip icon={Boxes} label="CRM object set" />
                <ContextChip icon={Eye} label="citations on" />
              </div>
            </div>
            <div className="space-y-3 p-3">
              <ChatBubble by="user">
                Which accounts need a next step before Friday?
              </ChatBubble>
              <ChatBubble by="agent">
                I found 18 warm accounts. 5 have no next action and 2 have stale
                owner assignments.
              </ChatBubble>
              <div className="flex flex-wrap gap-1.5">
                <QuietAction icon={Boxes} label="Open object set" />
                <QuietAction icon={ListChecks} label="Create task" />
                <QuietAction icon={Workflow} label="Propose action" />
              </div>
            </div>
            <div className="border-t border-border/70 p-3">
              <CommandComposer compact />
            </div>
          </div>

          <SectionHeader title="Tasks are explicit" meta="not every chat" />
          <div className="grid gap-3 md:grid-cols-2">
            <WorkCard
              icon={MessageSquare}
              title="Manual conversation"
              label="chat route"
              body="Ask, inspect, and decide without creating a board task."
              active
            />
            <WorkCard
              icon={SquareKanban}
              title="Tracked task"
              label="task route"
              body="Create when ownership, due date, or delivery state matters."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function InspectorPanel({
  tab,
  onTabChange,
  surface,
}: {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  surface: PrototypeSurface;
}) {
  return (
    <aside className="border-t border-border/70 bg-card/50 xl:min-h-0 xl:w-[340px] xl:border-l xl:border-t-0">
      <div className="sticky top-0 flex max-h-screen flex-col overflow-hidden">
        <div className="border-b border-border/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <PanelRight className="size-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Inspector</h2>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {surface}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            <InspectorButton
              active={tab === "summary"}
              label="Summary"
              onClick={() => onTabChange("summary")}
            />
            <InspectorButton
              active={tab === "evidence"}
              label="Evidence"
              onClick={() => onTabChange("evidence")}
            />
            <InspectorButton
              active={tab === "trace"}
              label="Trace"
              onClick={() => onTabChange("trace")}
            />
            <InspectorButton
              active={tab === "policy"}
              label="Policy"
              onClick={() => onTabChange("policy")}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "summary" ? <InspectorSummary /> : null}
          {tab === "evidence" ? <InspectorEvidence /> : null}
          {tab === "trace" ? <InspectorTrace /> : null}
          {tab === "policy" ? <InspectorPolicy /> : null}
        </div>
      </div>
    </aside>
  );
}

function InspectorButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
        active
          ? "bg-background text-foreground ring-1 ring-border"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function InspectorSummary() {
  return (
    <div className="space-y-3">
      <InspectorBlock icon={Boxes} title="Selected object set">
        <KeyValue label="Name" value="Warm enterprise opportunities" />
        <KeyValue label="Mode" value="dynamic query" />
        <KeyValue label="Freshness" value="6 minutes ago" />
        <KeyValue label="Available actions" value="4" />
      </InspectorBlock>
      <InspectorBlock icon={CircleDot} title="State">
        <MiniTimeline
          items={[
            "Source records indexed",
            "Object set materialized",
            "Agent cited object set",
            "Approval waiting",
          ]}
        />
      </InspectorBlock>
    </div>
  );
}

function InspectorEvidence() {
  return (
    <div className="space-y-3">
      <InspectorBlock icon={FileText} title="Citations">
        <EvidenceRow title="sales-notes.md" detail="mentions procurement timing" />
        <EvidenceRow title="crm-export.csv" detail="owner and stage fields" />
        <EvidenceRow title="call-summary.md" detail="follow-up requested" />
      </InspectorBlock>
      <InspectorBlock icon={Network} title="Links">
        <KeyValue label="Accounts" value="18" />
        <KeyValue label="People" value="43" />
        <KeyValue label="Open opportunities" value="7" />
      </InspectorBlock>
    </div>
  );
}

function InspectorTrace() {
  return (
    <div className="space-y-3">
      <InspectorBlock icon={Waypoints} title="Trace">
        <MiniTimeline
          items={[
            "retrieval.context",
            "oag.object_set.query",
            "policy.check",
            "agent.response",
          ]}
        />
      </InspectorBlock>
      <InspectorBlock icon={Database} title="Graphiti Memory">
        <KeyValue label="Status" value="connected" />
        <KeyValue label="Episodes" value="0" />
        <KeyValue label="Display" value="empty source, not product graph" />
      </InspectorBlock>
    </div>
  );
}

function InspectorPolicy() {
  return (
    <div className="space-y-3">
      <InspectorBlock icon={ShieldCheck} title="Approval">
        <KeyValue label="Write mode" value="approval required" />
        <KeyValue label="Criteria" value="2 passed, 1 needs review" />
        <KeyValue label="Denied fields" value="private notes" />
      </InspectorBlock>
      <InspectorBlock icon={KeyRound} title="Scope">
        <MiniTimeline items={["personal read", "company write gated", "audit logged"]} />
      </InspectorBlock>
    </div>
  );
}

function CommandComposer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <SegmentedMini active icon={MessageSquare} label="Chat" />
        <SegmentedMini icon={SquareKanban} label="Task" />
        <SegmentedMini icon={Workflow} label="Action" />
      </div>
      <div className="p-3">
        <label className="sr-only" htmlFor={compact ? "command-compact" : "command-main"}>
          Compose
        </label>
        <textarea
          id={compact ? "command-compact" : "command-main"}
          className={cn(
            "min-h-16 w-full resize-none bg-transparent text-[14px] leading-6 outline-none placeholder:text-muted-foreground/70",
            compact ? "min-h-10" : "sm:min-h-20"
          )}
          placeholder="Ask Operator to inspect the current object set..."
          defaultValue=""
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="size-3.5" />
            Context
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="size-3.5" />
            Cite
          </Button>
          <Button size="sm" className="ml-auto">
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function ObjectMap({ onInspect }: { onInspect: () => void }) {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-md border border-border bg-card p-4">
      <div className="absolute inset-x-8 top-[104px] h-px bg-border" />
      <div className="absolute left-[30%] top-[104px] h-[112px] w-px bg-border" />
      <div className="absolute right-[28%] top-[104px] h-[112px] w-px bg-border" />
      <div className="grid min-h-[260px] grid-cols-1 gap-4 md:grid-cols-3">
        <MapNode
          icon={Database}
          title="Sources"
          detail="Vault, CRM, calls"
          onClick={onInspect}
        />
        <MapNode
          icon={Boxes}
          title="Objects"
          detail="Account, Person, Opportunity"
          active
          onClick={onInspect}
        />
        <MapNode
          icon={Workflow}
          title="Actions"
          detail="approve, merge, assign"
          onClick={onInspect}
        />
        <MapNode
          icon={FileText}
          title="Evidence"
          detail="citations and media"
          onClick={onInspect}
        />
        <MapNode
          icon={Bot}
          title="Agents"
          detail="Operator, Builder"
          onClick={onInspect}
        />
        <MapNode
          icon={ShieldCheck}
          title="Policy"
          detail="permissions and audit"
          onClick={onInspect}
        />
      </div>
    </div>
  );
}

function MapNode({
  icon: Icon,
  title,
  detail,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative z-10 flex min-h-[96px] flex-col justify-between rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/30",
        active ? "border-amber-400/60 shadow-sm" : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">{detail}</p>
    </button>
  );
}

function WorkCard({
  icon: Icon,
  title,
  label,
  body,
  active,
}: {
  icon: LucideIcon;
  title: string;
  label: string;
  body: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/30",
        active ? "border-amber-400/60" : "border-border"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <p className="text-[12px] leading-5 text-muted-foreground">{body}</p>
    </button>
  );
}

function DecisionRow({
  title,
  detail,
  tone,
  onInspect,
}: {
  title: string;
  detail: string;
  tone: "amber" | "green" | "neutral";
  onInspect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onInspect}
      className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "amber" && "bg-amber-500",
          tone === "green" && "bg-emerald-500",
          tone === "neutral" && "bg-muted-foreground/40"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {detail}
        </span>
      </span>
      <Eye className="size-3.5 text-muted-foreground" />
    </button>
  );
}

function ManagementRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {detail}
        </span>
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </button>
  );
}

function ChatBubble({ by, children }: { by: "user" | "agent"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[88%] rounded-md border px-3 py-2 text-[13px] leading-5",
        by === "user"
          ? "ml-auto border-primary/20 bg-primary text-primary-foreground"
          : "border-border bg-muted/40"
      )}
    >
      {children}
    </div>
  );
}

function InspectorBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-[13px] font-medium">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EvidenceRow({ title, detail }: { title: string; detail: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md bg-muted/35 px-2 py-2 text-left"
    >
      <FileText className="size-3.5 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium">{title}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

function MiniTimeline({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-[12px]">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <span className="min-w-0 truncate">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );
}

function HarnessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/35 px-2 py-1.5">
      <span>{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{value}</span>
    </div>
  );
}

function StatusDot({ state }: { state: string }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        state === "Ready" && "bg-emerald-500",
        state === "Review" && "bg-amber-500",
        state === "Empty" && "bg-muted-foreground/40"
      )}
    />
  );
}

function CountPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px]">
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[14px] font-semibold tracking-normal">{title}</h2>
      <span className="text-[11px] text-muted-foreground">{meta}</span>
    </div>
  );
}

function ContextChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function QuietAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </button>
  );
}

function SegmentedButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function SegmentedMini({
  active,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}
