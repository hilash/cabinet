"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { usePresenceStore } from "@/stores/presence-store";
import type { PresenceEvent } from "@/lib/presence/presence-store";

/**
 * Invisible component mounted once in app-shell.
 * Manages the SSE connection for presence events and sends periodic heartbeats.
 * Re-connects automatically when the active team changes.
 */
export function PresenceProvider() {
  const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
  const applyEvent = usePresenceStore((s) => s.applyEvent);
  const esRef = useRef<EventSource | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(async () => {
    const teamSlug = useAppStore.getState().currentTeamSlug;
    const currentPath = useEditorStore.getState().currentPath;
    if (!teamSlug) return;
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamSlug, currentPath }),
      });
    } catch {
      // Ignore network errors — heartbeat will retry on next interval
    }
  }, []);

  useEffect(() => {
    if (!currentTeamSlug) return;

    // Clean up any previous connection
    esRef.current?.close();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Open new SSE connection for this team
    const es = new EventSource(
      `/api/presence/events?team=${encodeURIComponent(currentTeamSlug)}`
    );
    esRef.current = es;

    es.addEventListener("presence", (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as PresenceEvent;

        // Content updates are routed directly to the editor via custom DOM events
        // rather than going through the Zustand presence store.
        if (event.type === "content_update") {
          const { currentPath, isDirty } = useEditorStore.getState();
          // Only apply if the user is on the same page and not actively editing
          if (event.path === currentPath && !isDirty) {
            window.dispatchEvent(
              new CustomEvent("presence:content_update", {
                detail: { path: event.path, content: event.content },
              })
            );
          }
          return;
        }

        applyEvent(event);
      } catch {
        // Ignore malformed events
      }
    });

    // Initial heartbeat + periodic 10s heartbeat
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10_000);

    return () => {
      es.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [currentTeamSlug, applyEvent, sendHeartbeat]);

  return null;
}

/**
 * Send a presence update with selection/scroll position.
 * Called from the editor on selection changes and scroll events.
 */
export async function sendPresenceUpdate(extra: {
  selectionFrom?: number;
  selectionTo?: number;
  scrollY?: number;
}): Promise<void> {
  const teamSlug = useAppStore.getState().currentTeamSlug;
  const currentPath = useEditorStore.getState().currentPath;
  if (!teamSlug) return;
  try {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamSlug, currentPath, ...extra }),
    });
  } catch {
    // Ignore — non-critical
  }
}

/**
 * Broadcast document content to all collaborators after a successful save.
 * Fire-and-forget — the server excludes the author from the broadcast.
 */
export function sendContentBroadcast(path: string, content: string): void {
  fetch("/api/presence/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  }).catch(() => {
    // Non-critical — collaborators will see the change on their next load
  });
}
