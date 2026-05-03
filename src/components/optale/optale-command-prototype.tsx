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
  ClipboardList,
  Clock3,
  Database,
  Eye,
  FileText,
  GitBranch,
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
  SquareKanban,
  TerminalSquare,
  Users,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PrototypeSurface = "chat" | "data" | "brain" | "agents" | "tasks";
type PanelTab = "context" | "sources" | "inspect";
type BrainMode = "overview" | "objects" | "actions" | "sources";

type PrimaryTab = {
  id: PrototypeSurface;
  label: string;
  icon: LucideIcon;
};

type SidebarItem = {
  label: string;
  meta: string;
  icon: LucideIcon;
  active?: boolean;
};

const PRIMARY_TABS: PrimaryTab[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "data", label: "Data", icon: FileText },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "agents", label: "Agents", icon: Users },
  { id: "tasks", label: "Tasks", icon: SquareKanban },
];

const SIDEBAR_ITEMS: Record<PrototypeSurface, SidebarItem[]> = {
  chat: [
    { label: "Operator chat", meta: "current", icon: MessageSquare, active: true },
    { label: "Sales brief", meta: "saved", icon: Archive },
    { label: "Source mapping", meta: "running", icon: Workflow },
    { label: "Friday follow-up", meta: "draft", icon: Clock3 },
  ],
  data: [
    { label: "Company Brain", meta: "space", icon: Archive, active: true },
    { label: "Vault", meta: "files", icon: FileText },
    { label: "CRM Objects", meta: "object set", icon: Boxes },
    { label: "Source Inbox", meta: "12 pending", icon: Database },
  ],
  brain: [
    { label: "Operating map", meta: "overview", icon: Network, active: true },
    { label: "Object types", meta: "4", icon: Boxes },
    { label: "Action types", meta: "32", icon: Workflow },
    { label: "Policies", meta: "gated", icon: ShieldCheck },
  ],
  agents: [
    { label: "Operator", meta: "ready", icon: Bot, active: true },
    { label: "Research", meta: "ready", icon: Search },
    { label: "Builder", meta: "idle", icon: Workflow },
    { label: "Reviewer", meta: "watching", icon: ShieldCheck },
  ],
  tasks: [
    { label: "Approve CRM merge", meta: "review", icon: ListChecks, active: true },
    { label: "Map sales source", meta: "running", icon: GitBranch },
    { label: "Clean stale contacts", meta: "queued", icon: Clock3 },
  ],
};

const OBJECT_TYPES = [
  { name: "Account", count: "126", state: "healthy" },
  { name: "Person", count: "842", state: "healthy" },
  { name: "Opportunity", count: "48", state: "mapping" },
  { name: "Conversation", count: "1.9k", state: "indexed" },
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
  initialSurface = "chat",
}: {
  initialSurface?: PrototypeSurface;
}) {
  const [surface, setSurface] = useState<PrototypeSurface>(initialSurface);
  const [panelTab, setPanelTab] = useState<PanelTab>("context");
  const [brainMode, setBrainMode] = useState<BrainMode>("overview");
  const sidebarItems = useMemo(() => SIDEBAR_ITEMS[surface], [surface]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <PrototypeSidebar
          surface={surface}
          onSurfaceChange={setSurface}
          sidebarItems={sidebarItems}
        />

        <section className="flex min-w-0 flex-1 flex-col border-t border-border/70 lg:border-l lg:border-t-0">
          <PrototypeHeader surface={surface} />
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {surface === "chat" ? <ChatSurface /> : null}
              {surface === "data" ? <DataSurface /> : null}
              {surface === "brain" ? (
                <BrainSurface mode={brainMode} onModeChange={setBrainMode} />
              ) : null}
              {surface === "agents" ? <AgentsSurface /> : null}
              {surface === "tasks" ? <TasksSurface /> : null}
            </div>
            <ContextPanel tab={panelTab} onTabChange={setPanelTab} surface={surface} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PrototypeSidebar({
  surface,
  onSurfaceChange,
  sidebarItems,
}: {
  surface: PrototypeSurface;
  onSurfaceChange: (surface: PrototypeSurface) => void;
  sidebarItems: SidebarItem[];
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-sidebar lg:h-screen lg:w-[300px]">
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

      <div className="border-y border-sidebar-border/70 px-2 py-2">
        <div
          role="tablist"
          aria-label="Optale Command sections"
          className="grid grid-cols-5 gap-1 rounded-lg bg-muted/45 p-1"
        >
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = surface === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSurfaceChange(tab.id)}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[8px] font-semibold uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

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

        <div className="mt-3 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={`${surface}-${item.label}`}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
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

function PrototypeHeader({ surface }: { surface: PrototypeSurface }) {
  const title = {
    chat: "Operator Chat",
    data: "Knowledge Base",
    brain: "Brain",
    agents: "Agents",
    tasks: "Tasks",
  }[surface];
  const eyebrow = {
    chat: "conversation workspace",
    data: "files, pages, views",
    brain: "operating map",
    agents: "roster and routines",
    tasks: "explicit work",
  }[surface];

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
        <CountPill label="sources" value="8" />
        <CountPill label="agents" value="4" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Search className="size-3.5" />
          Search
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Context panel">
          <PanelRight className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}

function ChatSurface() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] w-full max-w-4xl flex-col px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <ContextChip icon={Archive} label="Thor / Optale" />
        <ContextChip icon={Boxes} label="Warm opportunities" />
        <ContextChip icon={FileText} label="q2-sales-brief.md" />
        <ContextChip icon={ShieldCheck} label="approval gated" />
      </div>

      <div className="flex-1 space-y-4">
        <ChatMessage by="assistant">
          I have the sales brief, CRM object set, and recent source notes in
          context. What should we work through?
        </ChatMessage>
        <ChatMessage by="user">
          Which accounts need a next step before Friday?
        </ChatMessage>
        <ChatMessage by="assistant">
          I found 18 warm accounts. Five do not have a next action, and two have
          stale owner assignments. I can open the object set, draft follow-ups,
          or prepare a governed CRM update for review.
        </ChatMessage>
        <div className="ml-11 flex flex-wrap gap-1.5">
          <QuietAction icon={Boxes} label="Open object set" />
          <QuietAction icon={FileText} label="Draft brief" />
          <QuietAction icon={Workflow} label="Propose action" />
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 bg-background pb-3 pt-2">
        <CommandComposer />
      </div>
    </div>
  );
}

function DataSurface() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <section className="rounded-md border border-border bg-card">
        <div className="border-b border-border/70 px-3 py-2">
          <h2 className="text-[13px] font-semibold">Company Brain</h2>
          <p className="text-[11px] text-muted-foreground">Files and generated views</p>
        </div>
        <div className="space-y-1 p-2">
          <TreeRow depth={0} label="strategy" active />
          <TreeRow depth={1} label="q2-sales-brief" />
          <TreeRow depth={1} label="market-map" />
          <TreeRow depth={0} label="crm" />
          <TreeRow depth={1} label="warm-opportunities.csv" />
          <TreeRow depth={1} label="account-object-set" />
          <TreeRow depth={0} label="sources" />
          <TreeRow depth={1} label="call-notes" />
        </div>
      </section>

      <section className="min-w-0 rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold tracking-normal">
              Q2 Sales Brief
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Updated by Operator · 6 minutes ago · linked to CRM object set
            </p>
          </div>
          <ViewToggle active icon={FileText} label="Page" />
          <ViewToggle icon={Database} label="Table" />
          <ViewToggle icon={Network} label="Graph" />
        </div>
        <article className="mx-auto max-w-3xl px-5 py-7">
          <h3 className="mb-3 text-2xl font-semibold tracking-normal">
            Accounts needing next action
          </h3>
          <p className="mb-5 text-[14px] leading-7 text-muted-foreground">
            Five warm enterprise opportunities have no next action before
            Friday. The highest-confidence next move is to prepare short,
            owner-specific follow-ups and hold CRM writes for approval.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <DocStat label="Warm accounts" value="18" />
            <DocStat label="Missing next action" value="5" />
            <DocStat label="Owner conflicts" value="2" />
          </div>
          <div className="mt-6 rounded-md border border-border bg-muted/25 p-4">
            <h4 className="mb-2 text-[13px] font-semibold">Generated object view</h4>
            <p className="text-[13px] leading-6 text-muted-foreground">
              This page is editable like Cabinet, but it can also expose object
              sets, citations, tables, and graph pivots without leaving the
              knowledge base.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function BrainSurface({
  mode,
  onModeChange,
}: {
  mode: BrainMode;
  onModeChange: (mode: BrainMode) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-md border border-border bg-card p-4">
          <SectionHeader title="Operating map" meta="Action Graph source" />
          <ObjectMap />
        </div>
        <div className="space-y-3">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type.name}
              type="button"
              className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <Boxes className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{type.name}</span>
                <span className="block text-[11px] text-muted-foreground">{type.count} objects</span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {type.state}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AgentsSurface() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-md border border-border bg-card">
        <div className="border-b border-border/70 px-3 py-2">
          <h2 className="text-[13px] font-semibold">AI team</h2>
          <p className="text-[11px] text-muted-foreground">Roster first, harness later</p>
        </div>
        {AGENTS.map((agent, index) => (
          <button
            key={agent.name}
            type="button"
            className={cn(
              "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30",
              index > 0 && "border-t border-border/70"
            )}
          >
            <span className={cn("flex size-8 items-center justify-center rounded-md text-white", agent.accent)}>
              <Bot className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{agent.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{agent.role}</span>
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {agent.status}
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-md border border-border bg-card">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="text-[15px] font-semibold tracking-normal">Operator</h2>
          <p className="text-[11px] text-muted-foreground">
            Daily command agent · can read Brain and propose actions
          </p>
        </div>
        <div className="space-y-4 p-4">
          <ChatMessage by="assistant">
            I can answer against the current space, open pages, or prepare tracked
            work only when you choose to turn the conversation into a task.
          </ChatMessage>
          <CommandComposer compact />
          <details className="rounded-md border border-border bg-muted/20 p-3">
            <summary className="cursor-pointer text-[13px] font-medium">
              Harness and provider details
            </summary>
            <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
              <KeyValue label="Provider" value="Claude Code" />
              <KeyValue label="MCP policy" value="read default, write gated" />
              <KeyValue label="Artifacts" value="logs, diffs, traces" />
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

function TasksSurface() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <SectionHeader title="Explicit tasks" meta="created only when work needs tracking" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TaskColumn title="Review" items={["Approve CRM merge", "Check owner conflicts"]} />
        <TaskColumn title="Running" items={["Map sales source"]} />
        <TaskColumn title="Queued" items={["Clean stale contacts"]} />
      </div>
    </div>
  );
}

function ContextPanel({
  tab,
  onTabChange,
  surface,
}: {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  surface: PrototypeSurface;
}) {
  return (
    <aside className="border-t border-border/70 bg-card/50 xl:min-h-0 xl:w-[360px] xl:border-l xl:border-t-0">
      <div className="sticky top-0 flex max-h-screen flex-col overflow-hidden">
        <div className="border-b border-border/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <PanelRight className="size-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Working Context</h2>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {surface}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <PanelButton active={tab === "context"} label="Context" onClick={() => onTabChange("context")} />
            <PanelButton active={tab === "sources"} label="Sources" onClick={() => onTabChange("sources")} />
            <PanelButton active={tab === "inspect"} label="Inspect" onClick={() => onTabChange("inspect")} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "context" ? <ContextTab /> : null}
          {tab === "sources" ? <SourcesTab /> : null}
          {tab === "inspect" ? <InspectTab /> : null}
        </div>
      </div>
    </aside>
  );
}

function ContextTab() {
  return (
    <div className="space-y-3">
      <PanelBlock icon={Boxes} title="Active object set">
        <KeyValue label="Name" value="Warm opportunities" />
        <KeyValue label="Mode" value="dynamic query" />
        <KeyValue label="Count" value="18 objects" />
      </PanelBlock>
      <PanelBlock icon={FileText} title="Knowledge base">
        <EvidenceRow title="q2-sales-brief.md" detail="current editable brief" />
        <EvidenceRow title="warm-opportunities.csv" detail="table view available" />
        <EvidenceRow title="call-notes/" detail="source folder" />
      </PanelBlock>
      <PanelBlock icon={ListChecks} title="Approvals">
        <ApprovalRow title="CRM merge" detail="12 record updates need review" />
      </PanelBlock>
    </div>
  );
}

function SourcesTab() {
  return (
    <div className="space-y-2">
      {SOURCES.map((source) => (
        <button
          key={source.name}
          type="button"
          className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <StatusDot state={source.state} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{source.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{source.detail}</span>
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

function InspectTab() {
  return (
    <div className="space-y-3">
      <PanelBlock icon={Waypoints} title="Trace">
        <MiniTimeline items={["retrieval.context", "oag.object_set.query", "policy.check", "assistant.response"]} />
      </PanelBlock>
      <PanelBlock icon={ShieldCheck} title="Policy">
        <KeyValue label="Write mode" value="approval required" />
        <KeyValue label="Denied fields" value="private notes" />
      </PanelBlock>
      <PanelBlock icon={KeyRound} title="Memory Graph">
        <KeyValue label="Status" value="connected" />
        <KeyValue label="Episodes" value="0" />
      </PanelBlock>
    </div>
  );
}

function CommandComposer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <ModePill active icon={MessageSquare} label="Chat" />
        <ModePill icon={SquareKanban} label="Task" />
        <ModePill icon={Workflow} label="Action" />
      </div>
      <div className="p-3">
        <label className="sr-only" htmlFor={compact ? "command-compact" : "command-main"}>
          Compose
        </label>
        <textarea
          id={compact ? "command-compact" : "command-main"}
          className={cn(
            "w-full resize-none bg-transparent text-[14px] leading-6 outline-none placeholder:text-muted-foreground/70",
            compact ? "min-h-12" : "min-h-24"
          )}
          placeholder="Message Operator..."
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

function ChatMessage({ by, children }: { by: "user" | "assistant"; children: ReactNode }) {
  const assistant = by === "assistant";
  return (
    <div className={cn("flex gap-3", !assistant && "justify-end")}>
      {assistant ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white">
          <Bot className="size-4" />
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] rounded-md border px-3 py-2 text-[13px] leading-6",
          assistant
            ? "border-border bg-card"
            : "border-primary/20 bg-primary text-primary-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ObjectMap() {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      <MapNode icon={Database} title="Sources" detail="Vault, CRM, calls" />
      <MapNode active icon={Boxes} title="Objects" detail="Account, Person, Opportunity" />
      <MapNode icon={Workflow} title="Actions" detail="approve, merge, assign" />
      <MapNode icon={FileText} title="Evidence" detail="citations and pages" />
      <MapNode icon={Bot} title="Agents" detail="Operator, Builder" />
      <MapNode icon={ShieldCheck} title="Policy" detail="permissions and audit" />
    </div>
  );
}

function MapNode({
  icon: Icon,
  title,
  detail,
  active,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-[112px] rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/30",
        active ? "border-amber-400/60" : "border-border"
      )}
    >
      <div className="mb-7 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">{detail}</p>
    </button>
  );
}

function TaskColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="border-b border-border/70 px-3 py-2 text-[13px] font-semibold">
        {title}
      </div>
      <div className="space-y-2 p-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-[12px] transition-colors hover:bg-muted/30"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function PanelButton({
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

function PanelBlock({
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
        <span className="block truncate text-[10px] text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function ApprovalRow({ title, detail }: { title: string; detail: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md bg-amber-500/10 px-2 py-2 text-left text-amber-700 dark:text-amber-300"
    >
      <ClipboardList className="size-3.5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium">{title}</span>
        <span className="block truncate text-[10px]">{detail}</span>
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

function TreeRow({
  depth,
  label,
  active,
}: {
  depth: number;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-muted/50",
        active && "bg-accent text-accent-foreground"
      )}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <FileText className="size-3.5 text-muted-foreground" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function DocStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-2xl font-semibold tracking-normal">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
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

function ViewToggle({
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
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors",
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

function ModePill({
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
