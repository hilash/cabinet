"use client";

import { useEffect, useState, useCallback } from "react";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";
import { ScrollArea } from "@multica/ui/components/ui/scroll-area";
import { TreeNode } from "./tree-node";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@multica/ui/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { LinkRepoDialog } from "./link-repo-dialog";
import {
  ChevronRight,
  Plus,
  BookOpen,
  Users,
  Bot,
  Pencil,
  FilePlus,
  FolderOpen,
  GitBranch,
  Copy,
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
import { getDataDir } from "@/lib/data-dir-cache";

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

/* ── item style matching TreeNode exactly ──────────────────── */

const itemClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 w-full text-left py-1.5 px-2 text-[13px] rounded-md transition-colors",
    "hover:bg-accent/50",
    active && "bg-accent text-accent-foreground font-medium"
  );

const sectionClass =
  "flex items-center gap-2 w-full text-left py-1.5 px-3 text-[13px] rounded-md transition-colors text-foreground/80 hover:bg-accent/50";

export function TreeView() {
  const { nodes, loading, selectedPath } = useTreeStore();
  const selectPage = useTreeStore((s) => s.selectPage);
  const createPage = useTreeStore((s) => s.createPage);
  const loadPage = useEditorStore((s) => s.loadPage);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);

  const [cabinetExpanded, setCabinetExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cabinet-section-expanded") !== "false";
    }
    return true;
  });
  const [agentsExpanded, setAgentsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cabinet-agents-expanded") !== "false";
    }
    return true;
  });
  const [kbExpanded, setKbExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cabinet-kb-expanded") !== "false";
    }
    return true;
  });
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [kbSubPageOpen, setKbSubPageOpen] = useState(false);
  const [kbSubPageTitle, setKbSubPageTitle] = useState("");
  const [kbCreating, setKbCreating] = useState(false);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);

  // When a KB page is clicked (via TreeNode), switch section to "page"
  useEffect(() => {
    const unsub = useTreeStore.subscribe((state, prevState) => {
      if (state.selectedPath !== prevState.selectedPath && state.selectedPath) {
        setSection({ type: "page" });
      }
    });
    return unsub;
  }, [setSection]);

  /* ── agent polling ─────────────────────────────────────────── */

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  const toggleCabinet = () => {
    const next = !cabinetExpanded;
    setCabinetExpanded(next);
    localStorage.setItem("cabinet-section-expanded", String(next));
  };
  const toggleAgents = () => {
    const next = !agentsExpanded;
    setAgentsExpanded(next);
    localStorage.setItem("cabinet-agents-expanded", String(next));
  };
  const toggleKb = () => {
    const next = !kbExpanded;
    setKbExpanded(next);
    localStorage.setItem("cabinet-kb-expanded", String(next));
  };

  const isAgentsSection =
    section.type === "agents" || section.type === "agent";

  // depth-based padding matching TreeNode: depth * 16 + 8
  const pad = (depth: number) => ({ paddingLeft: `${depth * 16 + 8}px` });

  return (
    <>
    <div>
      <div className="py-1">
        {/* ── Cabinet (depth 0) ───────────────────────────── */}
        <button
          onClick={() => {
            toggleCabinet();
            setSection({ type: "home" });
          }}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 w-full text-left flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
          style={pad(0)}
        >
          <Archive className="h-3.5 w-3.5 shrink-0" />
          Cabinet
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
                  toggleAgents();
                  setSection({ type: "agents" });
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                Agents
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSection({ type: "agents" });
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("cabinet:open-add-agent"));
                  }, 100);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title="Add agent"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  toggleAgents();
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
                {/* General agent (depth 2) */}
                <button
                  onClick={() =>
                    setSection({ type: "agent", slug: "general" })
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
                    key={agent.slug}
                    onClick={() =>
                      setSection({ type: "agent", slug: agent.slug })
                    }
                    className={itemClass(
                      section.type === "agent" && section.slug === agent.slug
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

            {/* ── Divider ──────────────────────────────────── */}
            <div className="mx-3 my-1.5 border-t border-border" />

            {/* ── 知识库 label ──────────────────────── */}
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  onClick={() => {
                    toggleKb();
                    selectPage("");
                    loadPage("");
                    setSection({ type: "page" });
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 w-full text-left flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
                  style={pad(1)}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  知识库
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
                  添加子页面
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setLinkRepoOpen(true)}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  加载知识
                </ContextMenuItem>
                <ContextMenuItem onClick={async () => {
                  const dir = await getDataDir();
                  navigator.clipboard.writeText(dir);
                }}>
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  复制完整路径
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  fetch("/api/system/open-data-dir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subpath: "" }),
                  });
                }}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  在 Finder 中打开
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {kbExpanded && (
              <>
                {nodes.length === 0 ? (
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
                    添加你的第一个页面
                  </button>
                ) : (
                  nodes.map((node) => (
                    <TreeNode key={node.path} node={node} depth={2} />
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>

    <Dialog open={kbSubPageOpen} onOpenChange={setKbSubPageOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加子页面 to &ldquo;知识库&rdquo;</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!kbSubPageTitle.trim()) return;
            setKbCreating(true);
            try {
              await createPage("", kbSubPageTitle.trim());
              const slug = kbSubPageTitle
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              loadPage(slug);
              selectPage(slug);
              setSection({ type: "page" });
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
