"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "success" | "error";

interface SystemToast {
  key: string;
  kind: ToastKind;
  message: string;
}

const DISMISS_MS = 4500;

export function SystemToasts() {
  const [toasts, setToasts] = useState<SystemToast[]>([]);

  const dismiss = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent).detail as
        | { kind?: ToastKind; message?: string }
        | undefined;
      if (!detail?.message) return;
      const next: SystemToast = {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: detail.kind || "info",
        message: detail.message,
      };
      setToasts((prev) => [...prev, next]);
      setTimeout(() => dismiss(next.key), DISMISS_MS);
    }
    window.addEventListener("cabinet:toast", handler);
    return () => window.removeEventListener("cabinet:toast", handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] mx-auto flex w-fit flex-col gap-2">
      {toasts.map((toast) => {
        const Icon =
          toast.kind === "error"
            ? XCircle
            : toast.kind === "success"
              ? CheckCircle2
              : Info;
        return (
          <div
            key={toast.key}
            className={cn(
              "flex max-w-md items-start gap-2 rounded-lg border bg-popover px-3 py-2 text-[12px] shadow-lg backdrop-blur-sm",
              "animate-in slide-in-from-bottom-2 fade-in duration-200",
              toast.kind === "error"
                ? "border-red-500/30 text-foreground"
                : toast.kind === "success"
                  ? "border-emerald-500/30 text-foreground"
                  : "border-border text-foreground"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                toast.kind === "error"
                  ? "text-red-500"
                  : toast.kind === "success"
                    ? "text-emerald-500"
                    : "text-muted-foreground"
              )}
            />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.key)}
              className="-me-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
