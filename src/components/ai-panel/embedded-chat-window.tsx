"use client";

import { useEffect } from "react";
import { WorkspaceIdProvider } from "@multica/core/hooks";
import { useWorkspaceStore } from "@multica/core/workspace";
import { useChatStore } from "@multica/core/chat";
import { ChatWindow } from "@multica/views/chat";

/**
 * Wraps ChatWindow for embedding inside the AI panel.
 *
 * ChatWindow normally renders as a floating window with fixed positioning and
 * checks `isOpen` from useChatStore. When embedded:
 *  1. We force isOpen=true so it renders.
 *  2. We force isFullscreen=false so it doesn't take over the viewport.
 *  3. We override its fixed/absolute positioning via a CSS wrapper so it flows
 *     naturally inside the panel.
 *  4. We provide WorkspaceIdProvider (not set up at Cabinet layout level).
 */
export function EmbeddedChatWindow() {
  const workspace = useWorkspaceStore((s) => s.workspace);

  // Keep the chat store's isOpen flag true while this component is mounted,
  // so ChatWindow doesn't bail out with `if (!isOpen) return null`.
  // Also ensure fullscreen is off so the embedded layout works.
  useEffect(() => {
    const state = useChatStore.getState();
    const prevOpen = state.isOpen;
    if (!prevOpen) state.setOpen(true);
    // Ensure not fullscreen when embedded
    if (state.isFullscreen) state.toggleFullscreen();
    return () => {
      if (!prevOpen) useChatStore.getState().setOpen(false);
    };
  }, []);

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
        登录 Multica 以使用对话功能。
      </div>
    );
  }

  return (
    <WorkspaceIdProvider wsId={workspace.id}>
      {/* Override ChatWindow's fixed positioning so it fills the panel instead */}
      <div className="flex-1 min-h-0 flex flex-col [&>div]:!static [&>div]:!w-full [&>div]:!h-full [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!shadow-none [&>div]:!inset-auto">
        <ChatWindow />
      </div>
    </WorkspaceIdProvider>
  );
}
