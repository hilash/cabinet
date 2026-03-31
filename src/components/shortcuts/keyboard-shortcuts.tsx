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

      // Cmd+M — toggle Mission Control
      if (isMod && e.key === "m" && !e.shiftKey) {
        e.preventDefault();
        if (section.type === "mission-control") {
          setSection({ type: "page" });
        } else {
          setSection({ type: "mission-control" });
        }
      }

      // Cmd+/ — focus Agent Slack input (when in Mission Control)
      if (isMod && e.key === "/" && section.type === "mission-control") {
        e.preventDefault();
        const slackInput = document.querySelector<HTMLInputElement>(
          'input[placeholder^="Message #"]'
        );
        slackInput?.focus();
      }

      // Cmd+N — open Create Agent dialog (when in Mission Control)
      if (isMod && e.key === "n" && !e.shiftKey && section.type === "mission-control") {
        e.preventDefault();
        // Trigger create dialog via custom event
        window.dispatchEvent(new CustomEvent("cabinet:create-agent"));
      }

      // Cmd+1-9 — jump to agent card by position (Mission Control)
      if (isMod && !e.shiftKey && e.key >= "1" && e.key <= "9" && section.type === "mission-control") {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        const cards = document.querySelectorAll<HTMLElement>("[data-agent-card]");
        if (cards[idx]) {
          cards[idx].click();
          cards[idx].scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      // Cmd+K is handled by search-dialog component
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminal, save, toggleAI, section, setSection]);

  return null;
}
