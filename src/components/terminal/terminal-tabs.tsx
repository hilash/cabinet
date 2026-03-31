"use client";

import { Plus, X, Bot, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { WebTerminal } from "./web-terminal";
import { useCallback, useRef, useState } from "react";

export function TerminalTabs() {
  const {
    terminalTabs,
    activeTerminalTab,
    addTerminalTab,
    removeTerminalTab,
    setActiveTerminalTab,
    closeTerminal,
  } = useAppStore();

  const [height, setHeight] = useState(350);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      const startY = e.clientY;
      const startHeight = height;

      const onMouseMove = (e: MouseEvent) => {
        if (!draggingRef.current) return;
        const delta = startY - e.clientY;
        const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, startHeight + delta));
        setHeight(newHeight);
      };

      const onMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [height]
  );

  if (terminalTabs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col border-t border-border bg-[#0a0a0a]"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        className="flex items-center justify-center h-1.5 cursor-row-resize hover:bg-primary/20 transition-colors group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-0.5 rounded-full bg-[#ffffff15] group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center bg-[#141414] border-b border-[#ffffff10] px-1 shrink-0">
        {terminalTabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] cursor-pointer border-b-2 transition-colors",
              activeTerminalTab === tab.id
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
            onClick={() => setActiveTerminalTab(tab.id)}
          >
            {tab.prompt && <Bot className="h-2.5 w-2.5 text-primary" />}
            <span>{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTerminalTab(tab.id);
              }}
              className="hover:text-destructive"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => addTerminalTab()}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={closeTerminal}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Active terminal */}
      <div className="flex-1 relative min-h-0">
        {terminalTabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0",
              activeTerminalTab === tab.id ? "block" : "hidden"
            )}
          >
            <WebTerminal
              sessionId={tab.id}
              prompt={tab.prompt}
              onClose={() => removeTerminalTab(tab.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
