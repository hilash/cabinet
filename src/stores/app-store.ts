import { create } from "zustand";

export type SectionType = "page" | "agents" | "agent" | "jobs" | "settings" | "mission-control";

export interface SelectedSection {
  type: SectionType;
  slug?: string; // agent slug when type === "agent"
}

interface TerminalTab {
  id: string;
  label: string;
  prompt?: string;
}

interface AppState {
  section: SelectedSection;
  terminalOpen: boolean;
  terminalTabs: TerminalTab[];
  activeTerminalTab: string | null;
  sidebarCollapsed: boolean;
  aiPanelCollapsed: boolean;
  setSection: (section: SelectedSection) => void;
  // Keep setViewMode as alias for backward compat
  setViewMode: (mode: string) => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
  addTerminalTab: (label?: string, prompt?: string) => void;
  removeTerminalTab: (id: string) => void;
  setActiveTerminalTab: (id: string) => void;
  openAgentTab: (taskTitle: string, prompt: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiPanelCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  section: { type: "mission-control" },
  terminalOpen: false,
  terminalTabs: [],
  activeTerminalTab: null,
  sidebarCollapsed: false,
  aiPanelCollapsed: false,

  setSection: (section) => set({ section }),

  setViewMode: (mode) => {
    // Backward compat: map old viewMode strings to sections
    if (mode === "editor") set({ section: { type: "page" } });
    else if (mode === "agents") set({ section: { type: "agents" } });
    else if (mode === "jobs") set({ section: { type: "jobs" } });
    else if (mode === "settings") set({ section: { type: "settings" } });
  },

  toggleTerminal: () => {
    const { terminalOpen, terminalTabs } = get();
    if (!terminalOpen && terminalTabs.length === 0) {
      const id = `term-${Date.now()}`;
      set({
        terminalOpen: true,
        terminalTabs: [{ id, label: "Claude 1" }],
        activeTerminalTab: id,
      });
    } else {
      set({ terminalOpen: !terminalOpen });
    }
  },

  closeTerminal: () => set({ terminalOpen: false }),

  addTerminalTab: (label?: string, prompt?: string) => {
    const { terminalTabs } = get();
    const num = terminalTabs.length + 1;
    const id = `term-${Date.now()}`;
    set({
      terminalTabs: [
        ...terminalTabs,
        { id, label: label || `Claude ${num}`, prompt },
      ],
      activeTerminalTab: id,
      terminalOpen: true,
    });
  },

  removeTerminalTab: (id) => {
    const { terminalTabs, activeTerminalTab } = get();
    const next = terminalTabs.filter((t) => t.id !== id);
    let newActive = activeTerminalTab;
    if (activeTerminalTab === id) {
      newActive = next.length > 0 ? next[next.length - 1].id : null;
    }
    set({
      terminalTabs: next,
      activeTerminalTab: newActive,
      terminalOpen: next.length > 0,
    });
  },

  setActiveTerminalTab: (id) => set({ activeTerminalTab: id }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setAiPanelCollapsed: (collapsed) => set({ aiPanelCollapsed: collapsed }),

  openAgentTab: (taskTitle: string, prompt: string) => {
    const id = `agent-${Date.now()}`;
    const { terminalTabs } = get();
    set({
      terminalTabs: [
        ...terminalTabs,
        { id, label: `Agent: ${taskTitle.slice(0, 20)}`, prompt },
      ],
      activeTerminalTab: id,
      terminalOpen: true,
    });
  },
}));
