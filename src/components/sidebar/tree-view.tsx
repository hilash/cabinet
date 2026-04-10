"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  ChevronRight,
  Plus,
  BookOpen,
  Users,
  Bot,
  Pencil,
  FilePlus,
  FolderOpen,
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

export function TreeView() {
  const { nodes, loading, selectedPath } = useTreeStore();
  const selectPage = useTreeStore((s) => s.selectPage);
  const createPage = useTreeStore((s) => s.createPage);
  const loadPage = useEditorStore((s) => s.loadPage);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);

  const [cabinetExpanded, setCabinetExpanded] = useState(true);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [kbExpanded, setKbExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [kbSubPageOpen, setKbSubPageOpen] = useState(false);
  const [kbSubPageTitle, setKbSubPageTitle] = useState("");
  const [kbCreating, setKbCreating] = useState(false);

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
        Loading...
      </div>
    );
  }

  const isAgentsSection =
    section.type === "agents" || section.type === "agent";

  // depth-based padding matching TreeNode: depth * 16 + 8
  const pad = (depth: number) => ({ paddingLeft: `${depth * 16 + 8}px` });

  return (
    <>
    <ScrollArea className="flex-1 min-h-0">
      <div className="py-1">
        {/* ── Cabinet (depth 0) ───────────────────────────── */}
        <button
          onClick={() => setCabinetExpanded(!cabinetExpanded)}
          className={itemClass(false)}
          style={pad(0)}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
              cabinetExpanded && "rotate-90"
            )}
          />
          Cabinet
        </button>

        {cabinetExpanded && (
          <>
            {/* ── Agents (depth 1) ─────────────────────────── */}
            <button
              onClick={() => {
                setAgentsExpanded(!agentsExpanded);
                setSection({ type: "agents" });
              }}
              className={itemClass(isAgentsSection)}
              style={pad(1)}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
                  agentsExpanded && "rotate-90"
                )}
              />
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              Agents
            </button>

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

            {/* ── Knowledge Base (depth 1) ─────────────────── */}
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  onClick={() => {
                    setKbExpanded(!kbExpanded);
                    selectPage("");
                    loadPage("");
                    setSection({ type: "page" });
                  }}
                  className={itemClass(section.type === "page" && selectedPath === "")}
                  style={pad(1)}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
                      kbExpanded && "rotate-90"
                    )}
                  />
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Knowledge Base
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => setKbSubPageOpen(true)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Sub Page
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  fetch("/api/system/open-data-dir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subpath: "" }),
                  });
                }}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open in Finder
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
                    Add your first page
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
    </ScrollArea>

    <Dialog open={kbSubPageOpen} onOpenChange={setKbSubPageOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sub Page to &ldquo;Knowledge Base&rdquo;</DialogTitle>
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

    </>
  );
}
