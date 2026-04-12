"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";

export function KeyboardShortcuts() {
  const { toggleTerminal, section, setSection } = useAppStore();
  const { save } = useEditorStore();
  const { toggle: toggleAI } = useAIPanelStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+S — save current page
      if (isMod && e.key === "s") {
        e.preventDefault();
        save();
      }

      // Cmd+` — toggle terminal
      if (isMod && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
      }

      // Cmd+Shift+A — toggle AI panel
      if (isMod && e.shiftKey && e.key === "a") {
        e.preventDefault();
        toggleAI();
      }

      // Cmd+Shift+I — go to Issues
      if (isMod && e.shiftKey && e.key === "i") {
        e.preventDefault();
        setSection({ type: "issues" });
      }

      // Cmd+Shift+P — go to Projects
      if (isMod && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setSection({ type: "projects" });
      }

      // Cmd+M — toggle Agents view
      if (isMod && e.key === "m" && !e.shiftKey) {
        e.preventDefault();
        if (section.type === "agents") {
          setSection({ type: "page" });
        } else {
          setSection({ type: "agents" });
        }
      }

      // Cmd+K is handled by search-dialog component
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminal, save, toggleAI, section, setSection]);

  return null;
}
