"use client";

import { Check, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CabinetAgentSummary } from "@/types/cabinets";

/**
 * Shared agent-picker dropdown. Callers supply the trigger; the menu body
 * renders a list of agents (paused ones included + flagged) and fires
 * `onSelect(slug)` on click. Picking the agent that already owns the task
 * is suppressed (marked with a checkmark, click is a no-op).
 */
export function ReassignMenu({
  agents,
  currentSlug,
  onSelect,
  children,
  triggerClassName,
  headerLabel = "Reassign to",
}: {
  agents: CabinetAgentSummary[];
  currentSlug?: string | null;
  onSelect: (slug: string) => void | Promise<void>;
  /** Rendered inside the DropdownMenuTrigger button. */
  children: React.ReactNode;
  /** Class to apply to the trigger button itself. */
  triggerClassName?: string;
  headerLabel?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClassName}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        <DropdownMenuLabel>{headerLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {agents.length === 0 ? (
          <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
            No agents in this space.
          </div>
        ) : (
          agents.map((agent) => {
            const isCurrent = agent.slug === currentSlug;
            const paused = !agent.active;
            return (
              <DropdownMenuItem
                key={agent.scopedId}
                disabled={isCurrent}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isCurrent) return;
                  void onSelect(agent.slug);
                }}
                className={cn(
                  "flex items-center gap-2",
                  isCurrent && "opacity-60"
                )}
              >
                <AgentAvatar agent={agent} shape="circle" size="sm" />
                <span className="flex-1 truncate text-[12.5px] text-foreground">
                  {agent.displayName ?? agent.name}
                </span>
                {paused ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Pause className="size-2.5" />
                    paused
                  </span>
                ) : null}
                {isCurrent ? (
                  <Check className="size-3.5 shrink-0 text-muted-foreground" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
