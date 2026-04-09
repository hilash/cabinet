import { create } from "zustand";

export type SectionType = "page" | "agents" | "agent" | "jobs" | "settings";

export interface SelectedSection {
  type: SectionType;
  slug?: string; // agent slug when type === "agent"
}

interface TerminalTab {
  id: string;
  label: string;
  prompt?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AppState {
  section: SelectedSection;
  terminalOpen: boolean;
  terminalTabs: TerminalTab[];
  activeTerminalTab: string | null;
  sidebarCollapsed: boolean;
  aiPanelCollapsed: boolean;
  // Multi-team
  currentTeamSlug: string | null;
  teams: TeamInfo[];
  setSection: (section: SelectedSection) => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
  addTerminalTab: (label?: string, prompt?: string) => void;
  removeTerminalTab: (id: string) => void;
  setActiveTerminalTab: (id: string) => void;
  openAgentTab: (taskTitle: string, prompt: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiPanelCollapsed: (collapsed: boolean) => void;
  setCurrentTeam: (slug: string) => void;
  setTeams: (teams: TeamInfo[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  section: { type: "agents" },
  terminalOpen: false,
  terminalTabs: [],
  activeTerminalTab: null,
  sidebarCollapsed: false,
  aiPanelCollapsed: false,
  currentTeamSlug: null,
  teams: [],

  setSection: (section) => set({ section }),

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

  setCurrentTeam: (slug) => {
    set({ currentTeamSlug: slug });
    if (typeof window !== "undefined") {
      localStorage.setItem("kb-current-team", slug);
    }
  },

  setTeams: (teams) => {
    set({ teams });
    // Restore last used team or default to first
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("kb-current-team") : null;
    const { currentTeamSlug } = get();
    if (!currentTeamSlug) {
      const slug =
        (stored && teams.find((t) => t.slug === stored)?.slug) ||
        teams[0]?.slug ||
        null;
      if (slug) set({ currentTeamSlug: slug });
    }
  },

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
