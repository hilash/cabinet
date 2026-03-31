"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FolderOpen, Pause, Play, MoreHorizontal, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { AgentCard } from "./agent-card";
import type { GoalMetric } from "@/types/agents";

interface AgentSummary {
  name: string;
  emoji: string;
  role: string;
  slug: string;
  active: boolean;
  running?: boolean;
  type: string;
  goals: GoalMetric[];
  lastHeartbeat?: string;
  nextHeartbeat?: string;
  lastAction?: string;
  pendingTasks?: number;
}

interface DepartmentCardProps {
  department: string;
  agents: AgentSummary[];
  onAgentClick?: (slug: string) => void;
  onAgentToggle?: (slug: string, active: boolean) => void;
  onAgentRun?: (slug: string) => Promise<void>;
  onViewWorkspace?: (department: string) => void;
  defaultCollapsed?: boolean;
}

export function DepartmentCard({ department, agents, onAgentClick, onAgentToggle, onAgentRun, onViewWorkspace, defaultCollapsed }: DepartmentCardProps) {
  const lead = agents.find((a) => a.type === "lead");
  const specialists = agents.filter((a) => a.type !== "lead");
  const activeCount = agents.filter((a) => a.active).length;
  const [togglingAll, setTogglingAll] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? agents.length > 2);

  const allGoals = agents.flatMap((a) => a.goals);
  const goalsWithData = allGoals.filter((g) => g.target > 0 && g.current > 0);
  const totalGoals = goalsWithData.length;
  const onTrack = goalsWithData.filter((g) => g.current / g.target >= 0.4).length;

  const handleToggleAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingAll) return;
    setTogglingAll(true);
    try {
      const action = activeCount > 0 ? "pause" : "activate";
      const slugs = agents.map((a) => a.slug);
      await fetch("/api/agents/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slugs }),
      });
      // Trigger refresh via toggle callbacks
      for (const a of agents) {
        if ((action === "pause" && a.active) || (action === "activate" && !a.active)) {
          onAgentToggle?.(a.slug, a.active);
        }
      }
    } catch { /* ignore */ } finally {
      setTogglingAll(false);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Health indicator bar */}
      <div
        className={cn(
          "h-0.5",
          agents.some((a) => a.running) ? "bg-emerald-500 animate-pulse" :
          activeCount > 0 ? "bg-emerald-500" :
          totalGoals > 0 && onTrack < totalGoals * 0.4 ? "bg-red-500" :
          totalGoals > 0 && onTrack < totalGoals * 0.7 ? "bg-amber-500" :
          totalGoals > 0 && onTrack > 0 ? "bg-emerald-500" :
          "bg-muted-foreground/20"
        )}
      />
      {/* Department header */}
      <div
        className="px-3 py-2 border-b border-border/50 bg-muted/20 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            {lead && <span className="text-sm">{lead.emoji}</span>}
            <div>
              <h3 className="text-[12px] font-semibold capitalize">
                {department}
              </h3>
              <p className="text-[10px] text-muted-foreground/60">
                {activeCount}/{agents.length} active
                {totalGoals > 0 && (
                  <span className="ml-2">
                    {onTrack}/{totalGoals} goals on track
                  </span>
                )}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              agents.some((a) => a.running)
                ? "bg-emerald-500/10 text-emerald-500 animate-pulse"
                : activeCount > 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
            )}
          >
            {agents.some((a) => a.running) ? "Running" : activeCount > 0 ? "Live" : "Paused"}
          </div>
        </div>
      </div>

      {/* Agent list (collapsible) */}
      {!collapsed && (
        <div className="p-1.5 space-y-1">
          {lead && (
            <AgentCard
              key={lead.slug}
              {...lead}
              onClick={() => onAgentClick?.(lead.slug)}
              onToggle={() => onAgentToggle?.(lead.slug, lead.active)}
              onRun={onAgentRun ? () => onAgentRun(lead.slug) : undefined}
            />
          )}
          {specialists.map((agent) => (
            <AgentCard
              key={agent.slug}
              {...agent}
              onClick={() => onAgentClick?.(agent.slug)}
              onToggle={() => onAgentToggle?.(agent.slug, agent.active)}
              onRun={onAgentRun ? () => onAgentRun(agent.slug) : undefined}
            />
          ))}
        </div>
      )}

      {/* Collapsed summary: compact agent rows with mini goal bars */}
      {collapsed && (
        <div className="px-2 py-1.5 space-y-0.5">
          {agents.map((a) => {
            const topGoal = a.goals.length > 0
              ? a.goals.reduce((best, g) => (g.target > 0 ? (best.target > 0 ? (g.current / g.target > best.current / best.target ? g : best) : g) : best), a.goals[0])
              : null;
            const pct = topGoal && topGoal.target > 0 ? Math.min(100, Math.round((topGoal.current / topGoal.target) * 100)) : 0;
            const totalPct = a.goals.length > 0
              ? Math.round(a.goals.reduce((sum, g) => sum + (g.target > 0 ? Math.min(1, g.current / g.target) : 0), 0) / a.goals.filter(g => g.target > 0).length * 100) || 0
              : 0;
            const isBehind = totalPct > 0 && totalPct < 40;
            return (
              <button
                key={a.slug}
                onClick={(e) => { e.stopPropagation(); onAgentClick?.(a.slug); }}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/30 transition-colors text-left group"
              >
                <span className="text-sm shrink-0">{a.emoji}</span>
                <span className="text-[11px] font-medium truncate min-w-0 flex-1">{a.name}</span>
                {a.goals.length > 0 && a.goals.some(g => g.target > 0) ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isBehind ? "bg-amber-500" : totalPct > 100 ? "bg-blue-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, totalPct)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[9px] tabular-nums w-7 text-right",
                      isBehind ? "text-amber-500" : "text-muted-foreground/50"
                    )}>
                      {totalPct}%
                    </span>
                  </div>
                ) : (
                  <span className={cn(
                    "text-[9px]",
                    a.active ? "text-emerald-500" : "text-muted-foreground/40"
                  )}>
                    {a.running ? "●" : a.active ? "○" : "—"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Department actions footer */}
      <div className="px-3 py-2 border-t border-border/30 flex items-center gap-1.5">
        {lead && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewWorkspace?.(department); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            Workspace
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleAll(e); }}
          disabled={togglingAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          {togglingAll ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : activeCount > 0 ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {activeCount > 0 ? "Pause All" : "Start All"}
        </button>
      </div>
    </div>
  );
}
