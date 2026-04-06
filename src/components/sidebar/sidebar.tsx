"use client";

import {
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  PanelLeftClose,
  PanelLeft,
  Settings,
  Users,
  ChevronRight,
  Bot,
  Pencil,
  Crown,
  Megaphone,
  Search,
  ShieldCheck,
  Code,
  BarChart3,
  Briefcase,
  DollarSign,
  Wrench,
  Palette,
  Smartphone,
  Rocket,
  Handshake,
  PenTool,
  UserCheck,
  Scale,
  FolderOpen,
  GitBranch,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Separator } from "@/components/ui/separator";
import { TreeView } from "./tree-view";
import { NewPageDialog } from "./new-page-dialog";
import { LinkRepoDialog } from "./link-repo-dialog";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";

function useIsMobile() {
  const isMobile = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => window.innerWidth < 768,
    () => false
  );

  return isMobile;
}

interface AgentSummary {
  name: string;
  slug: string;
  emoji: string;
  active: boolean;
  runningCount?: number;
}

const AGENT_ICONS: Record<string, LucideIcon> = {
  general: Bot,
  editor: Pencil,
  ceo: Crown,
  coo: Briefcase,
  cfo: DollarSign,
  cto: Wrench,
  "content-marketer": Megaphone,
  seo: Search,
  "seo-specialist": Search,
  qa: ShieldCheck,
  "qa-agent": ShieldCheck,
  sales: BarChart3,
  "sales-agent": BarChart3,
  "product-manager": Briefcase,
  "ux-designer": Palette,
  "data-analyst": BarChart3,
  "social-media": Smartphone,
  "growth-marketer": Rocket,
  "customer-success": Handshake,
  copywriter: PenTool,
  devops: Code,
  developer: Code,
  "people-ops": UserCheck,
  legal: Scale,
  researcher: Search,
};

function getAgentIcon(slug: string): LucideIcon {
  return AGENT_ICONS[slug] || Bot;
}

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 280;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const loadTree = useTreeStore((s) => s.loadTree);
  const treeLoading = useTreeStore((s) => s.loading);

  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);
  const [openingDataDir, setOpeningDataDir] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const storedWidth = window.localStorage.getItem("cabinet-sidebar-width");
    const parsedWidth = storedWidth ? Number(storedWidth) : NaN;
    return Number.isFinite(parsedWidth)
      ? clamp(parsedWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
      : SIDEBAR_DEFAULT_WIDTH;
  });
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cabinet-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragStateRef.current) return;
      const nextWidth =
        dragStateRef.current.startWidth + (event.clientX - dragStateRef.current.startX);
      setSidebarWidth(clamp(nextWidth, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH));
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
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/personas");
      if (res.ok) {
        const data = await res.json();
        setAgents(
          (data.personas || []).map((p: AgentSummary) => ({
            name: p.name,
            slug: p.slug,
            emoji: p.emoji,
            active: p.active,
            runningCount: p.runningCount || 0,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadAgents();
    }, 0);
    const interval = window.setInterval(() => {
      void loadAgents();
    }, 5000);
    window.addEventListener("focus", loadAgents);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", loadAgents);
    };
  }, [loadAgents]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile, setCollapsed]);

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    dragStateRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  async function openKnowledgeBaseDir() {
    if (openingDataDir) return;

    setOpeningDataDir(true);
    try {
      const res = await fetch("/api/system/open-data-dir", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to open Knowledge Base folder.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open Knowledge Base folder.";
      alert(message);
    } finally {
      setOpeningDataDir(false);
    }
  }

  function refreshKnowledgeBase() {
    void loadTree();
  }

  const desktopClass = collapsed ? "w-0 overflow-hidden" : "shrink-0";
  const mobileClass = cn(
    "fixed left-0 top-0 bottom-0 z-40",
    collapsed ? "w-0 overflow-hidden" : "w-[280px]"
  );

  return (
    <>
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        suppressHydrationWarning
        className={cn(
          "flex flex-col bg-sidebar transition-all duration-200 h-screen overflow-hidden",
          isMobile ? mobileClass : desktopClass
        )}
        style={!isMobile && !collapsed ? { width: sidebarWidth } : undefined}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="text-[22px] italic tracking-[-0.01em] text-foreground"
              style={{ fontFamily: "var(--font-logo), Georgia, serif" }}
            >
              cabinet
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <Separator />

        {/* Team section */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Team
          </p>
          {/* Agents header with expand/collapse */}
          <button
            onClick={() => {
              setAgentsExpanded(!agentsExpanded);
              setSection({ type: "agents" });
            }}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors",
              section.type === "agents"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 transition-transform",
                agentsExpanded && "rotate-90"
              )}
            />
            <Users className="h-3.5 w-3.5 shrink-0" />
            Agents
          </button>

          {/* Collapsible agent list */}
          {agentsExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5">
              {/* General agent (always present) */}
              <button
                onClick={() =>
                  setSection({ type: "agent", slug: "general" })
                }
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1 rounded-md text-[11px] transition-colors",
                  section.type === "agent" && section.slug === "general"
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">General</span>
              </button>
              {/* Editor first, then rest */}
              {[
                ...agents.filter((a) => a.slug === "editor"),
                ...agents.filter((a) => a.slug !== "editor"),
              ].map((agent) => (
                <button
                  key={agent.slug}
                  onClick={() =>
                    setSection({ type: "agent", slug: agent.slug })
                  }
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1 rounded-md text-[11px] transition-colors",
                    section.type === "agent" && section.slug === agent.slug
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {(() => { const Icon = getAgentIcon(agent.slug); return <Icon className="h-3.5 w-3.5 shrink-0" />; })()}
                  <span className="truncate">{agent.name}</span>
                  <span
                    className={cn(
                      "ml-auto w-1.5 h-1.5 rounded-full shrink-0",
                      (agent.runningCount || 0) > 0
                        ? "bg-green-500"
                        : "bg-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          )}

        </div>

        <Separator />

        {/* Knowledge Base */}
        <ContextMenu>
          <ContextMenuTrigger className="block px-3 pt-2 pb-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-between gap-2 px-2 py-1"
                  />
                }
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Knowledge Base
                </span>
                {openingDataDir ? (
                  <Loader2
                    data-icon="inline-end"
                    className="animate-spin text-muted-foreground"
                  />
                ) : treeLoading ? (
                  <RefreshCw
                    data-icon="inline-end"
                    className="animate-spin text-muted-foreground"
                  />
                ) : (
                  <MoreHorizontal
                    data-icon="inline-end"
                    className="text-muted-foreground"
                  />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto min-w-40">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={openKnowledgeBaseDir}
                    disabled={openingDataDir}
                  >
                    <FolderOpen />
                    Open in Finder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLinkRepoOpen(true)}>
                    <GitBranch />
                    Add Symlink
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={refreshKnowledgeBase}
                    disabled={treeLoading}
                  >
                    <RefreshCw className={cn(treeLoading && "animate-spin")} />
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuItem
                onClick={openKnowledgeBaseDir}
                disabled={openingDataDir}
              >
                <FolderOpen />
                Open in Finder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setLinkRepoOpen(true)}>
                <GitBranch />
                Add Symlink
              </ContextMenuItem>
              <ContextMenuItem
                onClick={refreshKnowledgeBase}
                disabled={treeLoading}
              >
                <RefreshCw className={cn(treeLoading && "animate-spin")} />
                Refresh
              </ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>
        <TreeView />
        <LinkRepoDialog open={linkRepoOpen} onOpenChange={setLinkRepoOpen} />

        <div className="p-2 flex items-center gap-1">
          <div className="flex-1">
            <NewPageDialog />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              (section.type === "settings") && "bg-accent text-foreground"
            )}
            onClick={() => setSection({ type: "settings" })}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>
      {!isMobile && !collapsed && (
        <div className="relative -ml-px h-screen w-px shrink-0 bg-border">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={startResize}
            className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize bg-transparent"
          />
        </div>
      )}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 z-10 h-7 w-7",
            isMobile ? "left-3 z-50" : "left-2"
          )}
          onClick={() => setCollapsed(false)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
