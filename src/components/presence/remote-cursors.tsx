"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { PresenceData } from "@/lib/presence/presence-store";

interface CursorPosition {
  top: number;
  left: number;
  height: number;
  selectionWidth?: number;
}

function getCursorPosition(
  editor: Editor,
  from: number,
  to: number
): CursorPosition | null {
  try {
    const view = editor.view;
    const docSize = view.state.doc.content.size;
    const clampedFrom = Math.max(0, Math.min(from, docSize - 1));
    const clampedTo = Math.max(0, Math.min(to, docSize - 1));

    const startCoords = view.coordsAtPos(clampedFrom);
    const containerRect = view.dom.getBoundingClientRect();

    const top = startCoords.top - containerRect.top;
    const left = startCoords.left - containerRect.left;
    const height = startCoords.bottom - startCoords.top;

    // Single-line selection width
    let selectionWidth: number | undefined;
    if (clampedTo > clampedFrom) {
      const endCoords = view.coordsAtPos(clampedTo);
      // Only show highlight if on same line
      if (Math.abs(endCoords.top - startCoords.top) < 4) {
        selectionWidth = endCoords.right - startCoords.left;
      }
    }

    return { top, left, height, selectionWidth };
  } catch {
    return null;
  }
}

interface RemoteCursorProps {
  user: PresenceData;
  editor: Editor;
}

function RemoteCursor({ user, editor }: RemoteCursorProps) {
  const [pos, setPos] = useState<CursorPosition | null>(null);

  useEffect(() => {
    if (user.selectionFrom === undefined) return;

    const update = () => {
      const result = getCursorPosition(
        editor,
        user.selectionFrom!,
        user.selectionTo ?? user.selectionFrom!
      );
      setPos(result);
    };

    update();

    // Re-calculate when editor content changes (reflow)
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor, user.selectionFrom, user.selectionTo]);

  if (!pos) return null;

  const firstName = user.name.split(" ")[0];

  return (
    <div>
      {/* Name label — bottom edge flush with cursor top */}
      <div
        className="absolute text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap pointer-events-none z-20 transition-all duration-150"
        style={{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          transform: "translateY(-100%)",
          backgroundColor: user.color,
        }}
      >
        {firstName}
      </div>

      {/* Cursor line */}
      <div
        className="absolute w-0.5 pointer-events-none z-20 transition-all duration-150"
        style={{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          height: `${pos.height}px`,
          backgroundColor: user.color,
        }}
      />

      {/* Selection highlight */}
      {pos.selectionWidth !== undefined && pos.selectionWidth > 0 && (
        <div
          className="absolute pointer-events-none z-10 transition-all duration-150"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.selectionWidth}px`,
            height: `${pos.height}px`,
            backgroundColor: user.color,
            opacity: 0.2,
          }}
        />
      )}
    </div>
  );
}

interface RemoteCursorsProps {
  users: PresenceData[];
  editor: Editor | null;
}

export function RemoteCursors({ users, editor }: RemoteCursorsProps) {
  const activeUsers = users.filter((u) => u.selectionFrom !== undefined);

  if (!editor || activeUsers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {activeUsers.map((user) => (
        <RemoteCursor key={user.userId} user={user} editor={editor} />
      ))}
    </div>
  );
}
