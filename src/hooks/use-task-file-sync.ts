"use client";

import { useEffect } from "react";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { resolveArtifactTreePath } from "@/lib/ui/page-type-icons";
import { subscribeConversationEvents } from "@/lib/agents/conversation-events-client";

/**
 * Keeps the sidebar + open editor in sync with files that agent tasks create or
 * change — without the user having to refresh.
 *
 * Tasks publish the files they touch as `artifactPaths` on the conversation SSE
 * stream (incrementally as turns finalize, and authoritatively on the terminal
 * `task.updated`). We accumulate those, then on a short debounce:
 *   - refresh the file tree so new/renamed files appear,
 *   - mark changed paths in the sidebar (tint + dot, cleared when opened),
 *   - reload the open page if it changed and has no unsaved edits; if it has
 *     unsaved edits, offer a non-destructive "Reload" toast instead of
 *     clobbering them.
 *
 * Mount once (in the app shell). Rides the shared conversation event stream,
 * so it costs no extra connection.
 */
export function useTaskFileSync(): void {
  useEffect(() => {
    let pending = new Set<string>();
    let flushTimer: number | null = null;
    // Don't re-toast the same dirty page on every debounce tick during a run.
    let notifiedDirtyPath: string | null = null;

    const flush = () => {
      flushTimer = null;
      const treePaths = [...pending];
      pending = new Set();
      if (treePaths.length === 0) return;

      const editor = useEditorStore.getState();
      const openPath = editor.currentPath;

      // Mark every file the task touched with the "new content" dot —
      // including the page currently open in the editor. The editor agent's
      // whole job is editing the open page, so excluding it (the previous
      // behavior) meant the most common task never surfaced any change
      // indicator. The dot is the persistent signal; opening/refocusing the
      // file clears it (selectPage → clearChanged). We still reload the open
      // page in place below so its content stays fresh.
      useTreeStore.getState().markChanged(treePaths);
      // `fresh` busts the server tree cache: agents write straight to disk, so
      // a plain reload could serve the pre-write snapshot and the new files
      // wouldn't show until the user hit refresh.
      void useTreeStore.getState().loadTree({ fresh: true });

      if (openPath && treePaths.includes(openPath)) {
        if (!editor.isDirty) {
          void editor.loadPage(openPath); // safe: no unsaved edits
          notifiedDirtyPath = null;
        } else if (notifiedDirtyPath !== openPath && typeof window !== "undefined") {
          notifiedDirtyPath = openPath;
          window.dispatchEvent(
            new CustomEvent("cabinet:toast", {
              detail: {
                kind: "info",
                message: "A task changed this page. Reload to see the update?",
                actionLabel: "Reload",
                onAction: () => void useEditorStore.getState().loadPage(openPath),
              },
            }),
          );
        }
      }
    };

    // Artifact paths are reported relative to the task's working directory
    // (its `cabinetPath`); re-root them to the `data/`-rooted tree path so the
    // highlight matches real tree nodes and the right page reloads.
    const schedule = (rawPaths: string[], cabinetPath?: string) => {
      for (const raw of rawPaths) {
        const tp = resolveArtifactTreePath(raw, cabinetPath);
        if (tp) pending.add(tp);
      }
      if (flushTimer === null) flushTimer = window.setTimeout(flush, 250);
    };

    const unsubscribe = subscribeConversationEvents((data) => {
      try {
        const event = JSON.parse(data) as {
          type?: string;
          cabinetPath?: unknown;
          payload?: { artifactPaths?: unknown; artifacts?: unknown };
        };
        if (!event || event.type === "ping") return;
        const p = event.payload ?? {};
        const cabinetPath =
          typeof event.cabinetPath === "string" ? event.cabinetPath : undefined;
        const raw = [
          ...(Array.isArray(p.artifactPaths) ? p.artifactPaths : []),
          ...(Array.isArray(p.artifacts) ? p.artifacts : []),
        ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        if (raw.length > 0) schedule(raw, cabinetPath);
      } catch {
        // ignore malformed events
      }
    });

    return () => {
      if (flushTimer !== null) window.clearTimeout(flushTimer);
      unsubscribe();
    };
  }, []);
}
