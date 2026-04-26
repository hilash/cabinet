"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Repeat, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/app-store";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import {
  StartWorkDialog,
  type StartWorkMode,
} from "@/components/composer/start-work-dialog";
import { fetchCabinetOverviewClient } from "@/lib/cabinets/overview-client";
import type { CabinetAgentSummary } from "@/types/cabinets";

/**
 * Shared "+ New Task" split button used in nav bars outside the Tasks board
 * (KB pages via ViewerToolbar, Agents workspace, etc.). The dialog is mounted
 * locally so opening it doesn't yank the user out of their current surface —
 * the previous implementation routed to section=tasks first, which left users
 * stranded on the tasks board if they dismissed the composer (audit #130).
 */
export function NewTaskButton() {
  const section = useAppStore((s) => s.section);
  const setTaskPanelConversation = useAppStore(
    (s) => s.setTaskPanelConversation
  );
  const cabinetVisibilityModes = useAppStore((s) => s.cabinetVisibilityModes);

  const cabinetPath =
    ("cabinetPath" in section && section.cabinetPath) || ROOT_CABINET_PATH;
  const visibilityMode = cabinetVisibilityModes[cabinetPath] || "own";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<StartWorkMode>("now");
  const [agents, setAgents] = useState<CabinetAgentSummary[]>([]);

  // Fetch agents on first open (and refetch if the cabinet changes between
  // opens). The overview client dedupes inflight requests and caches for 3s,
  // so this is cheap when other surfaces have already loaded the cabinet.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCabinetOverviewClient(cabinetPath, visibilityMode);
        if (!cancelled) setAgents(data.agents || []);
      } catch {
        if (!cancelled) setAgents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cabinetPath, visibilityMode]);

  const launch = (initialMode: StartWorkMode) => {
    setMode(initialMode);
    setOpen(true);
  };

  return (
    <>
      <div className="inline-flex h-7 items-stretch overflow-hidden rounded-md shadow-sm ring-1 ring-primary/20">
        <button
          type="button"
          onClick={() => launch("now")}
          className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          title="Create a new task"
        >
          <Plus className="size-3.5" />
          New Task
        </button>
        <div className="w-px bg-primary-foreground/20" aria-hidden />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center bg-primary px-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
            title="More new item types"
            aria-label="More new item types"
          >
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuItem
              onClick={() => launch("now")}
              className="flex items-start gap-2 py-2"
            >
              <Zap className="mt-0.5 size-3.5 text-foreground/70" />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium">New Task</span>
                <span className="text-[11px] text-muted-foreground">
                  Run once, right now
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => launch("recurring")}
              className="flex items-start gap-2 py-2"
            >
              <Repeat className="mt-0.5 size-3.5 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium">New Routine</span>
                <span className="text-[11px] text-muted-foreground">
                  Run this prompt on a schedule
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StartWorkDialog
        open={open}
        onOpenChange={setOpen}
        cabinetPath={cabinetPath}
        agents={agents}
        initialMode={mode}
        onStarted={async (conversationId, conversationCabinetPath) => {
          // Per audit #131: open the new task in the global side panel
          // instead of routing the user to the tasks board. The panel slides
          // in on the right of whatever surface they launched from.
          try {
            const params = new URLSearchParams();
            if (conversationCabinetPath) {
              params.set("cabinetPath", conversationCabinetPath);
            }
            const res = await fetch(
              `/api/agents/conversations/${encodeURIComponent(conversationId)}${
                params.toString() ? `?${params.toString()}` : ""
              }`
            );
            if (!res.ok) return;
            const data = await res.json();
            if (data?.meta) {
              setTaskPanelConversation(data.meta);
            }
          } catch {
            /* non-fatal — the task is created, we just couldn't open the panel */
          }
        }}
      />
    </>
  );
}
