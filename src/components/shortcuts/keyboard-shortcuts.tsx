"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { useTreeStore } from "@/stores/tree-store";

export function KeyboardShortcuts() {
  const { toggleTerminal, section, setSection } = useAppStore();
  const { save } = useEditorStore();
  const { toggle: toggleAI } = useAIPanelStore();
  const { toggleHiddenFiles } = useTreeStore();

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

      // Cmd+M — toggle Agents view
      if (isMod && e.key === "m" && !e.shiftKey) {
        e.preventDefault();
        if (section.type === "agents") {
          if (section.mode === "cabinet" && section.cabinetPath) {
            setSection({
              type: "cabinet",
              mode: "cabinet",
              cabinetPath: section.cabinetPath,
            });
          } else {
            setSection({ type: "home" });
          }
        } else {
          if (section.mode === "cabinet" && section.cabinetPath) {
            setSection({
              type: "agents",
              mode: "cabinet",
              cabinetPath: section.cabinetPath,
            });
          } else {
            setSection({ type: "agents", mode: "ops" });
          }
        }
      }

      // Cmd+Shift+. — toggle hidden files (same as macOS Finder)
      if (isMod && e.shiftKey && e.key === ".") {
        e.preventDefault();
        toggleHiddenFiles();
      }

      // Cmd+K is handled by search-dialog component
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminal, save, toggleAI, toggleHiddenFiles, section, setSection]);

  return null;
}
