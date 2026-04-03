"use client";

import { useEffect, useState, useCallback } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TreeView } from "./tree-view";
import { NewPageDialog } from "./new-page-dialog";
import { useAppStore } from "@/stores/app-store";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return { isMobile, mounted };
}

interface AgentSummary {
  name: string;
  slug: string;
  emoji: string;
  active: boolean;
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

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

export function Sidebar() {
  const { isMobile, mounted } = useIsMobile();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);

  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);

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
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (mounted && isMobile) setCollapsed(true);
  }, [mounted, isMobile, setCollapsed]);

  const desktopClass = collapsed ? "w-0 overflow-hidden" : "w-[280px] min-w-[280px]";
  const mobileClass = cn(
    "fixed left-0 top-0 bottom-0 z-40",
    collapsed ? "w-0 overflow-hidden" : "w-[280px]"
  );

  return (
    <>
      {mounted && isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        suppressHydrationWarning
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-200 h-screen overflow-hidden",
          mounted && isMobile ? mobileClass : desktopClass
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.png" alt="Cabinet" className="h-6 w-6 rounded" />
            <span className="text-[13px] font-semibold tracking-[-0.02em]">
              Cabinet
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
                      agent.active ? "bg-green-500" : "bg-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Knowledge Base */}
        <div className="px-3 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Knowledge Base
          </p>
        </div>
        <TreeView />

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
