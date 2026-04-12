"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "./tree-node";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkRepoDialog } from "./link-repo-dialog";
import {
  CornerLeftUp,
  ChevronRight,
  Plus,
  BookOpen,
  Users,
  Bot,
  Pencil,
  FilePlus,
  FolderOpen,
  GitBranch,
  ClipboardCopy,
  Archive,
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cronToShortLabel } from "@/lib/agents/cron-utils";
import {
  findNodeByPath,
  findParentCabinetNode,
  findRootCabinetNode,
} from "@/lib/cabinets/tree";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { cabinetVisibilityModeLabel } from "@/lib/cabinets/visibility";
import { getDataDir } from "@/lib/data-dir-cache";
import type { CabinetOverview } from "@/types/cabinets";

interface AgentSummary {
  scopedId?: string;
  name: string;
  slug: string;
  emoji: string;
  active: boolean;
  runningCount?: number;
  jobCount?: number;
  taskCount?: number;
  heartbeat?: string;
  cabinetPath?: string;
  cabinetName?: string;
  inherited?: boolean;
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

/* ── item style matching TreeNode exactly ──────────────────── */

const itemClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 w-full text-left py-1.5 px-2 text-[13px] rounded-md transition-colors",
    "hover:bg-accent/50",
    active && "bg-accent text-accent-foreground font-medium"
  );

export function TreeView() {
  const { nodes, loading, selectedPath } = useTreeStore();
  const selectPage = useTreeStore((s) => s.selectPage);
  const createPage = useTreeStore((s) => s.createPage);
  const loadPage = useEditorStore((s) => s.loadPage);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const cabinetVisibilityModes = useAppStore((s) => s.cabinetVisibilityModes);

  const [cabinetExpanded, setCabinetExpanded] = useState(true);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [kbExpanded, setKbExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [cabinetAgentScopeName, setCabinetAgentScopeName] = useState<string | null>(null);
  const [kbSubPageOpen, setKbSubPageOpen] = useState(false);
  const [kbSubPageTitle, setKbSubPageTitle] = useState("");
  const [kbCreating, setKbCreating] = useState(false);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);

  const rootCabinet = useMemo(() => findRootCabinetNode(nodes), [nodes]);
  const routeCabinetPath = section.mode === "cabinet" ? section.cabinetPath : undefined;
  const activeCabinet = useMemo(() => {
    if (!routeCabinetPath) return null;
    return findNodeByPath(nodes, routeCabinetPath);
  }, [nodes, routeCabinetPath]);
  const parentCabinet = useMemo(() => {
    if (!activeCabinet) return null;
    return findParentCabinetNode(nodes, activeCabinet.path);
  }, [activeCabinet, nodes]);
  const cabinetVisibilityMode = activeCabinet
    ? cabinetVisibilityModes[activeCabinet.path] || "own"
    : "own";
  const visibleTreeNodes = activeCabinet?.children || rootCabinet?.children || nodes;
  const kbSectionLabel = activeCabinet ? "Data" : "Knowledge Base";

  /* ── agent polling ─────────────────────────────────────────── */

  const loadAgents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        path: activeCabinet?.path || ROOT_CABINET_PATH,
        visibility: activeCabinet ? cabinetVisibilityMode : "all",
      });
      const res = await fetch(`/api/cabinets/overview?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as CabinetOverview;
        setCabinetAgentScopeName(
          activeCabinet ? data.cabinet.name : "All cabinets"
        );
        setAgents(
          (data.agents || []).map((agent) => ({
            scopedId: agent.scopedId,
            name: agent.name,
            slug: agent.slug,
            emoji: agent.emoji,
            active: agent.active,
            runningCount: 0,
            jobCount: agent.jobCount || 0,
            taskCount: agent.taskCount || 0,
            heartbeat: agent.heartbeat || "",
            cabinetPath: agent.cabinetPath,
            cabinetName: agent.cabinetName,
            inherited: agent.inherited,
          }))
        );
        return;
      }
    } catch {
      if (activeCabinet) {
        setCabinetAgentScopeName(
          activeCabinet.frontmatter?.title || activeCabinet.name
        );
        setAgents([]);
        return;
      }

      setCabinetAgentScopeName(null);
    }
  }, [activeCabinet, cabinetVisibilityMode]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  // depth-based padding matching TreeNode: depth * 16 + 8
  const pad = (depth: number) => ({ paddingLeft: `${depth * 16 + 8}px` });
  const cabinetPath = activeCabinet?.path || rootCabinet?.path || ROOT_CABINET_PATH;
  const dataRootPath = activeCabinet
    ? activeCabinet.path === ROOT_CABINET_PATH
      ? ""
      : activeCabinet.path
    : "";
  const selectedAgentScopedId =
    section.agentScopedId ||
    (section.type === "agent" && section.cabinetPath && section.slug
      ? `${section.cabinetPath}::agent::${section.slug}`
      : null);

  const openCabinetOverview = (targetCabinetPath = cabinetPath) => {
    selectPage(targetCabinetPath);
    void loadPage(targetCabinetPath);
    setSection({
      type: "cabinet",
      mode: "cabinet",
      cabinetPath: targetCabinetPath,
    });
  };

  const openParentCabinet = () => {
    if (!parentCabinet) return;
    openCabinetOverview(parentCabinet.path);
  };

  return (
    <>
    <ScrollArea className="flex-1 min-h-0">
      <div className="py-1">
        {/* ── Back to parent cabinet ────────────────────── */}
        {activeCabinet && parentCabinet ? (
          <button
            onClick={openParentCabinet}
            className="flex w-full items-center gap-1.5 px-3 pt-2 pb-1 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground/80"
            style={pad(0)}
            title={`Back to ${parentCabinet.frontmatter?.title || parentCabinet.name}`}
          >
            <CornerLeftUp className="h-3.5 w-3.5 shrink-0" />
            Back
          </button>
        ) : null}

        {/* ── Cabinet (depth 0) ───────────────────────────── */}
        <button
          onClick={() => {
            setCabinetExpanded(!cabinetExpanded);
            openCabinetOverview(activeCabinet?.path || cabinetPath);
          }}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 w-full text-left flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
          style={pad(0)}
        >
          <Archive className="h-3.5 w-3.5 shrink-0" />
          {activeCabinet
            ? activeCabinet.frontmatter?.title || activeCabinet.name
            : "Cabinet"}
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-150 ml-auto",
              cabinetExpanded && "rotate-90"
            )}
          />
        </button>

        {cabinetExpanded && (
          <>

            {/* ── Agents (depth 1) ─────────────────────────── */}
            <div
              className="group flex items-center gap-1.5 px-3 pt-2 pb-1 w-full"
              style={pad(1)}
            >
              <button
                onClick={() => {
                  setAgentsExpanded(!agentsExpanded);
                  if (activeCabinet) {
                    setSection({
                      type: "agents",
                      mode: "cabinet",
                      cabinetPath: activeCabinet.path,
                    });
                    return;
                  }
                  setSection({ type: "agents", mode: "ops" });
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                Agents
              </button>
              {activeCabinet ? (
                <span className="ml-auto truncate text-[10px] text-muted-foreground/60">
                  {[
                    cabinetAgentScopeName ||
                      activeCabinet.frontmatter?.title ||
                      activeCabinet.name,
                    cabinetVisibilityModeLabel(cabinetVisibilityMode),
                  ].join(" · ")}
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSection({ type: "agents", mode: "ops" });
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("cabinet:open-add-agent"));
                    }, 100);
                  }}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  title="Add agent"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  setAgentsExpanded(!agentsExpanded);
                }}
                className="text-muted-foreground/50 hover:text-foreground/80 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-150",
                    agentsExpanded && "rotate-90"
                  )}
                />
              </button>
            </div>

            {agentsExpanded && (
              <>
                {activeCabinet ? (
                  agents.length > 0 ? (
                    agents.map((agent) => (
                      <button
                        key={agent.scopedId || agent.slug}
                        onClick={() =>
                          setSection({
                            type: "agent",
                            mode: "cabinet",
                            slug: agent.slug,
                            cabinetPath: agent.cabinetPath || activeCabinet?.path,
                            agentScopedId:
                              agent.scopedId ||
                              `${agent.cabinetPath || activeCabinet?.path}::agent::${agent.slug}`,
                          })
                        }
                        className={cn(
                          "flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                          selectedAgentScopedId ===
                            (agent.scopedId ||
                              `${agent.cabinetPath || activeCabinet?.path}::agent::${agent.slug}`) &&
                            "bg-accent text-accent-foreground"
                        )}
                        style={pad(2)}
                      >
                        <span className="w-3.5 shrink-0" />
                        {(() => {
                          const Icon = getAgentIcon(agent.slug);
                          return (
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          );
                        })()}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px]">{agent.name}</span>
                            <span
                              className={cn(
                                "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
                                agent.active ? "bg-green-500" : "bg-muted-foreground/30"
                              )}
                            />
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                            {[
                              agent.inherited ? agent.cabinetName : null,
                              `${agent.jobCount || 0} ${(agent.jobCount || 0) === 1 ? "job" : "jobs"}`,
                              `${agent.taskCount || 0} ${(agent.taskCount || 0) === 1 ? "task" : "tasks"}`,
                              agent.heartbeat ? cronToShortLabel(agent.heartbeat) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div
                      className="px-3 py-2 text-[12px] text-muted-foreground"
                      style={pad(2)}
                    >
                      {cabinetVisibilityMode === "own"
                        ? "This cabinet does not have local agents yet."
                        : "No agents are visible in the selected cabinet scope."}
                    </div>
                  )
                ) : (
                  <>
                    {/* General agent (depth 2) */}
                    <button
                      onClick={() =>
                        setSection({ type: "agent", mode: "ops", slug: "general" })
                      }
                      className={itemClass(
                        section.type === "agent" && section.slug === "general"
                      )}
                      style={pad(2)}
                    >
                      <span className="w-3.5" />
                      <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">General</span>
                    </button>
                    {/* Editor first, then rest (depth 2) */}
                    {[
                      ...agents.filter((a) => a.slug === "editor"),
                      ...agents.filter((a) => a.slug !== "editor"),
                    ].map((agent) => (
                      <button
                        key={agent.scopedId || agent.slug}
                        onClick={() => {
                          if (agent.cabinetPath) {
                            setSection({
                              type: "agent",
                              mode: "cabinet",
                              slug: agent.slug,
                              cabinetPath: agent.cabinetPath,
                              agentScopedId:
                                agent.scopedId ||
                                `${agent.cabinetPath}::agent::${agent.slug}`,
                            });
                            return;
                          }
                          setSection({ type: "agent", mode: "ops", slug: agent.slug });
                        }}
                        className={itemClass(
                          selectedAgentScopedId ===
                            (agent.scopedId ||
                              (agent.cabinetPath
                                ? `${agent.cabinetPath}::agent::${agent.slug}`
                                : null)) ||
                            (section.mode === "ops" &&
                              section.type === "agent" &&
                              section.slug === agent.slug)
                        )}
                        style={pad(2)}
                      >
                        <span className="w-3.5" />
                        {(() => {
                          const Icon = getAgentIcon(agent.slug);
                          return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />;
                        })()}
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
                  </>
                )}
              </>
            )}

            {/* ── Divider ──────────────────────────────────── */}
            <div className="mx-3 my-1.5 border-t border-border" />

            {/* ── Knowledge Base label ──────────────────────── */}
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  onClick={() => {
                    setKbExpanded(!kbExpanded);
                    if (activeCabinet) {
                      openCabinetOverview(activeCabinet.path);
                      return;
                    }
                    setSection({ type: "home" });
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 w-full text-left flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
                  style={pad(1)}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  {kbSectionLabel}
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-150 ml-auto",
                      kbExpanded && "rotate-90"
                    )}
                  />
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => setKbSubPageOpen(true)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Sub Page
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setLinkRepoOpen(true)}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Load Knowledge
                </ContextMenuItem>
                <ContextMenuItem onClick={async () => {
                  const dir = await getDataDir();
                  navigator.clipboard.writeText(
                    dataRootPath ? `${dir}/${dataRootPath}` : dir
                  );
                }}>
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  Copy Full Path
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  fetch("/api/system/open-data-dir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subpath: dataRootPath }),
                  });
                }}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open in Finder
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {kbExpanded && (
              <>
                {visibleTreeNodes.length === 0 ? (
                  <button
                    onClick={() => {
                      const btn = document.querySelector<HTMLButtonElement>(
                        "[data-new-page-trigger]"
                      );
                      btn?.click();
                    }}
                    className={itemClass(false)}
                    style={pad(2)}
                  >
                    <span className="w-3.5" />
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {activeCabinet ? "Add cabinet data" : "Add your first page"}
                  </button>
                ) : (
                  visibleTreeNodes.map((node) => (
                    <TreeNode
                      key={node.path}
                      node={node}
                      depth={2}
                      contextCabinetPath={activeCabinet?.path || null}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </ScrollArea>

    <Dialog open={kbSubPageOpen} onOpenChange={setKbSubPageOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Sub Page to &ldquo;{activeCabinet ? kbSectionLabel : "Knowledge Base"}&rdquo;
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!kbSubPageTitle.trim()) return;
            setKbCreating(true);
            try {
              await createPage(dataRootPath, kbSubPageTitle.trim());
              const slug = kbSubPageTitle
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              const nextPath = dataRootPath ? `${dataRootPath}/${slug}` : slug;
              selectPage(nextPath);
              await loadPage(nextPath);
              setSection(
                activeCabinet
                  ? {
                      type: "page",
                      mode: "cabinet",
                      cabinetPath: activeCabinet.path,
                    }
                  : { type: "page" }
              );
              setKbSubPageTitle("");
              setKbSubPageOpen(false);
            } catch (error) {
              console.error("Failed to create sub page:", error);
            } finally {
              setKbCreating(false);
            }
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Page title..."
            value={kbSubPageTitle}
            onChange={(e) => setKbSubPageTitle(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!kbSubPageTitle.trim() || kbCreating}>
            {kbCreating ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>

    <LinkRepoDialog open={linkRepoOpen} onOpenChange={setLinkRepoOpen} />

    </>
  );
}
