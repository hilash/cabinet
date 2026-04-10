"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

interface TaskNotification {
  id: string;
  agentSlug: string;
  agentName: string;
  agentEmoji: string;
  title: string;
  status: "completed" | "failed";
  summary?: string;
  completedAt: string;
  /** Internal: auto-dismiss timer key */
  _key: string;
}

const DISMISS_MS = 8000;

// Synthesized notification sounds via Web Audio API — no files needed
function playNotificationSound(status: "completed" | "failed") {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (status === "completed") {
      // Two-tone ascending chime
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 587; // D5
      o1.connect(gain);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.12);

      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 880; // A5
      o2.connect(gain);
      o2.start(ctx.currentTime + 0.14);
      o2.stop(ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      setTimeout(() => ctx.close(), 500);
    } else {
      // Low descending tone
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 440; // A4
      o1.connect(gain);
      o1.start(ctx.currentTime);
      o1.stop(ctx.currentTime + 0.15);

      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 330; // E4
      o2.connect(gain);
      o2.start(ctx.currentTime + 0.17);
      o2.stop(ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      setTimeout(() => ctx.close(), 500);
    }
  } catch {
    // Audio not available — silently skip
  }
}

export function NotificationToasts() {
  const [toasts, setToasts] = useState<TaskNotification[]>([]);
  const setSection = useAppStore((s) => s.setSection);

  const dismiss = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t._key !== key));
  }, []);

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent).detail as Omit<TaskNotification, "_key">[];
      if (!detail?.length) return;
      const newToasts = detail.map((n) => ({
        ...n,
        _key: `${n.id}-${Date.now()}`,
      }));
      setToasts((prev) => [...prev, ...newToasts]);

      // Play sound for the first notification in the batch
      const first = newToasts[0];
      if (first) playNotificationSound(first.status);

      // Auto-dismiss each toast
      for (const t of newToasts) {
        setTimeout(() => dismiss(t._key), DISMISS_MS);
      }
    }

    window.addEventListener("cabinet:conversation-completed", handler);
    return () => window.removeEventListener("cabinet:conversation-completed", handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <button
          key={toast._key}
          type="button"
          onClick={() => {
            setSection({ type: "agent", slug: toast.agentSlug });
            window.dispatchEvent(
              new CustomEvent("cabinet:open-conversation", {
                detail: { conversationId: toast.id, agentSlug: toast.agentSlug },
              })
            );
            dismiss(toast._key);
          }}
          className={cn(
            "group flex w-[380px] items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-lg backdrop-blur-sm transition-all",
            "animate-in slide-in-from-right-5 fade-in duration-300",
            toast.status === "completed"
              ? "border-emerald-500/20 bg-card/95"
              : "border-red-500/20 bg-card/95"
          )}
        >
          <span className="mt-0.5 text-lg leading-none">{toast.agentEmoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {toast.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              )}
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  toast.status === "completed" ? "text-emerald-500" : "text-red-500"
                )}
              >
                {toast.status === "completed" ? "Completed" : "Failed"}
              </span>
            </div>
            <p className="mt-1 truncate text-[13px] font-medium text-foreground">
              {toast.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {toast.agentName}
            </p>
          </div>
          <div
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              dismiss(toast._key);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition group-hover:opacity-100 hover:bg-muted"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  );
}
