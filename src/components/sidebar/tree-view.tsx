"use client";

import { useEffect, useState } from "react";
import { useTreeStore } from "@/stores/tree-store";
import { useAppStore } from "@/stores/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "./tree-node";
import {
  Bot,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentPersonaSummary {
  name: string;
  slug: string;
  active: boolean;
  emoji?: string;
}

function SystemSections() {
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const selectPage = useTreeStore((s) => s.selectPage);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [agents, setAgents] = useState<AgentPersonaSummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/agents/personas")
      .then((r) => r.json())
      .then((data) => setAgents(data.personas || []))
      .catch(() => {});
  }, []);

  // Refresh agents when navigating back to agents section
  useEffect(() => {
    if (section.type === "agents" || section.type === "agent") {
      fetch("/api/agents/personas")
        .then((r) => r.json())
        .then((data) => setAgents(data.personas || []))
        .catch(() => {});
    }
  }, [section]);

  const handleSection = (type: "agents" | "jobs") => {
    selectPage(null as unknown as string);
    setSection({ type });
  };

  const handleAgent = (slug: string) => {
    selectPage(null as unknown as string);
    setSection({ type: "agent", slug });
  };

  const isSelected = (type: string, slug?: string) => {
    if (!mounted) return false;
    if (slug) return section.type === "agent" && section.slug === slug;
    return section.type === type;
  };

  return (
    <div className="py-1" suppressHydrationWarning>
      {/* Agents (collapsible) */}
      <button
        suppressHydrationWarning
        onClick={() => setAgentsExpanded(!agentsExpanded)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] rounded-md transition-colors",
          "text-foreground/80 hover:bg-accent/50"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
            agentsExpanded && "rotate-90"
          )}
        />
        <Bot className="h-4 w-4 shrink-0 text-purple-400" />
        <span>Agents</span>
      </button>

      {agentsExpanded && (
        <div className="ml-3">
          {agents.map((agent) => (
            <button
              key={agent.slug}
              suppressHydrationWarning
              onClick={() => handleAgent(agent.slug)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-1 text-[12px] rounded-md transition-colors",
                isSelected("agent", agent.slug)
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {/* Status dot */}
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                agent.active ? "bg-green-500" : "bg-muted-foreground/30"
              )} />
              {/* Emoji + name */}
              {agent.emoji && (
                <span className="text-[11px] shrink-0">{agent.emoji}</span>
              )}
              <span className="truncate">{agent.name}</span>
            </button>
          ))}
          {agents.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground/50">No agents yet</p>
          )}
        </div>
      )}

      {/* Jobs */}
      <button
        suppressHydrationWarning
        onClick={() => handleSection("jobs")}
        className={cn(
          "flex items-center gap-2 w-full pl-[22px] pr-3 py-1.5 text-[13px] rounded-md transition-colors",
          isSelected("jobs")
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80 hover:bg-accent/50"
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-amber-400" />
        <span>Jobs</span>
      </button>

      {/* Separator */}
      <div className="mx-3 my-1.5 border-t border-border" />
    </div>
  );
}

export function TreeView() {
  const { nodes, loading } = useTreeStore();
  const setSection = useAppStore((s) => s.setSection);

  // When a KB page is clicked (via TreeNode), switch section to "page"
  useEffect(() => {
    const unsub = useTreeStore.subscribe((state, prevState) => {
      if (state.selectedPath !== prevState.selectedPath && state.selectedPath) {
        setSection({ type: "page" });
      }
    });
    return unsub;
  }, [setSection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="py-1">
        {nodes.map((node) => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </ScrollArea>
  );
}
