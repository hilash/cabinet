"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Listen for multica real-time events and show toast notifications.
 * WebSocket connection is managed by CoreProvider.
 * This component hooks into custom events dispatched by the multica core.
 */
export function MulticaNotifications() {
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
    return () => {
      window.removeEventListener("multica:issue-update", onIssueUpdate);
      window.removeEventListener("multica:agent-complete", onAgentComplete);
    };
  }, []);

  return null;
}
