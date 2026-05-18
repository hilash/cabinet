"use client";

import { useState } from "react";
import { ArrowRightLeft, Loader2, Pencil, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteConversation,
  reassignConversation,
  restartConversation,
  stopConversation,
} from "./board-actions";
import { ReassignMenu } from "./reassign-menu";
import { IconHint } from "./icon-hint";
import type { CabinetAgentSummary } from "@/types/cabinets";
import type { TaskMeta, TaskStatus } from "@/types/tasks";
import { useLocale } from "@/i18n/use-locale";

/**
 * Hover-revealed action cluster for a task row/card. Shows Stop / Restart /
 * Delete as appropriate for the task's status. All clicks stopPropagation so
 * they don't also open the detail panel.
 */
export function RowActions({
  task,
  agents = [],
  onRefresh,
  className,
}: {
  task: TaskMeta;
  agents?: CabinetAgentSummary[];
  onRefresh?: () => Promise<void> | void;
  className?: string;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState<
    "stop" | "restart" | "delete" | "reassign" | null
  >(null);
  const visibility = visibilityFor(task.status);
  // An inbox draft is an idle task with no activity yet — exactly
  // lane-rules' Inbox derivation (TaskMeta.lastActivityAt already folds in
  // completedAt). `startedAt` is set at creation so it is NOT part of this
  // test. Only these can be edited in place — once a run has started the
  // prompt is history. tasks-board listens for the event and reopens the
  // Start Work dialog pre-filled.
  const isInboxDraft = task.status === "idle" && !task.lastActivityAt;
  // Inbox drafts haven't run yet, so "Restart" reads as the first run —
  // show a Play glyph + "Run now" copy instead of the circular-arrow
  // restart icon. Reassign is also dropped here: you pick the agent in the
  // composer, and handing off an unstarted draft has no real meaning.
  const canReassign =
    agents.length > 0 && task.status !== "archived" && !isInboxDraft;

  async function run(kind: "stop" | "restart" | "delete") {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "stop") {
        await stopConversation(task.id, task.cabinetPath);
      } else if (kind === "restart") {
        await restartConversation(task.id, task.cabinetPath);
      } else if (kind === "delete") {
        await deleteConversation(task.id, task.cabinetPath);
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(`[board] ${kind} failed`, err);
    } finally {
      setBusy(null);
    }
  }

  async function handleReassign(toSlug: string) {
    if (busy || toSlug === task.agentSlug) return;
    setBusy("reassign");
    try {
      await reassignConversation(task.id, toSlug, task.cabinetPath);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("[board] reassign failed", err);
    } finally {
      setBusy(null);
    }
  }

  if (
    !visibility.stop &&
    !visibility.restart &&
    !visibility.delete &&
    !canReassign &&
    !isInboxDraft
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5",
        "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {isInboxDraft ? (
        <ActionButton
          title={t("rowActionsPlus:edit")}
          hint={t("rowActionsPlus:editHint")}
          tone="primary"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("cabinet:open-edit-draft", {
                detail: { taskId: task.id, cabinetPath: task.cabinetPath },
              })
            );
          }}
          disabled={!!busy}
          icon={<Pencil className="size-3.5" />}
        />
      ) : null}
      {visibility.stop ? (
        <ActionButton
          title={t("rowActions:stop")}
          hint={t("rowActions:stopHint")}
          tone="destructive"
          onClick={(e) => {
            e.stopPropagation();
            void run("stop");
          }}
          disabled={!!busy}
          icon={busy === "stop" ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}
        />
      ) : null}
      {visibility.restart ? (
        <ActionButton
          title={isInboxDraft ? t("tinyExtras:runTaskNow") : t("rowActions:restart")}
          hint={isInboxDraft ? t("rowActions:runHint") : t("rowActions:restartHint")}
          tone="primary"
          onClick={(e) => {
            e.stopPropagation();
            void run("restart");
          }}
          disabled={!!busy}
          icon={
            busy === "restart" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isInboxDraft ? (
              <Play className="size-3.5" />
            ) : (
              <RotateCcw className="size-3.5" />
            )
          }
        />
      ) : null}
      {canReassign ? (
        <ReassignMenu
          agents={agents}
          currentSlug={task.agentSlug}
          onSelect={handleReassign}
          triggerHint={t("rowActions:reassignHint")}
          triggerClassName="inline-flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary disabled:opacity-50"
        >
          {busy === "reassign" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowRightLeft className="size-3.5" />
          )}
          <span className="sr-only">{t("rowActions:reassign")}</span>
        </ReassignMenu>
      ) : null}
      {visibility.delete ? (
        <ActionButton
          title={t("rowActionsPlus:delete")}
          hint={t("rowActionsPlus:deleteHint")}
          tone="destructive"
          onClick={(e) => {
            e.stopPropagation();
            void run("delete");
          }}
          disabled={!!busy}
          icon={busy === "delete" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        />
      ) : null}
    </div>
  );
}

function ActionButton({
  title,
  hint,
  onClick,
  disabled,
  icon,
  tone,
}: {
  /** Short verb — used as the accessible name. */
  title: string;
  /** Longer "what this does" line shown in the instant tooltip. */
  hint?: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tone: "destructive" | "primary";
}) {
  return (
    <IconHint label={hint ?? title} side="bottom">
      <button
        type="button"
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors disabled:opacity-50",
          tone === "destructive"
            ? "hover:bg-destructive/20 hover:text-destructive"
            : "hover:bg-primary/20 hover:text-primary"
        )}
      >
        {icon}
      </button>
    </IconHint>
  );
}

function visibilityFor(
  status: TaskStatus
): { stop: boolean; restart: boolean; delete: boolean } {
  switch (status) {
    case "running":
      return { stop: true, restart: false, delete: true };
    case "awaiting-input":
      return { stop: true, restart: true, delete: true };
    case "failed":
      return { stop: false, restart: true, delete: true };
    case "done":
    case "idle":
      return { stop: false, restart: true, delete: true };
    case "archived":
      return { stop: false, restart: false, delete: true };
  }
}
