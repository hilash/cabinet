"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Listen for multica real-time events and show toast notifications.
 * WebSocket connection is managed by CoreProvider.
 * This component hooks into custom events dispatched by the multica core.
 *
 * On mount, performs a health check against the Multica API.
 * If the server is unreachable, shows a one-time informational toast.
 */
export function MulticaNotifications() {
  const healthChecked = useRef(false);

  useEffect(() => {
    function onIssueUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.title) {
        toast.info(`Issue updated: ${detail.title}`);
      }
    }

    function onAgentComplete(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.title) {
        toast.success(`Agent completed: ${detail.title}`);
      }
    }

    window.addEventListener("multica:issue-update", onIssueUpdate);
    window.addEventListener("multica:agent-complete", onAgentComplete);

    // One-time health check — if the Multica server isn't running, let the
    // user know that task features won't be available.
    if (!healthChecked.current) {
      healthChecked.current = true;
      const checkHealth = async () => {
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= 6; attempt += 1) {
          try {
            const res = await fetch("/multica-api/health", { method: "GET" });
            if (!res.ok) throw new Error(`unhealthy status: ${res.status}`);
            toast.success("Multica connected");
            return;
          } catch (error) {
            lastError = error;
            if (attempt < 6) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
          }
        }
        console.warn("[multica] Server unreachable — task features are offline", lastError);
        toast.info("Multica server unavailable — task features are offline");
      };
      void checkHealth();
    }

    return () => {
      window.removeEventListener("multica:issue-update", onIssueUpdate);
      window.removeEventListener("multica:agent-complete", onAgentComplete);
    };
  }, []);

  return null;
}
