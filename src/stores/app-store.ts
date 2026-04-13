import { create } from "zustand";
import type { CabinetVisibilityMode } from "@/types/cabinets";
import type { ConversationMeta } from "@/types/conversations";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";

export type SectionType =
  | "home"
  | "cabinet"
  | "page"
  | "agents"
  | "agent"
  | "tasks"
  | "jobs"
  | "settings"
  | "registry";
export type SectionMode = "ops" | "cabinet";

const CABINET_VISIBILITY_STORAGE_KEY = "cabinet.visibility.modes";

export interface SelectedSection {
  type: SectionType;
  slug?: string; // agent slug when type === "agent"
  mode?: SectionMode;
  cabinetPath?: string; // cabinet scope for cabinet/page/agent/agents/jobs sections
  agentScopedId?: string;
  conversationId?: string; // auto-select this conversation on mount
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
  cabinetVisibilityModes: Record<string, CabinetVisibilityMode>;
  taskPanelConversation: ConversationMeta | null;
  setSection: (section: SelectedSection) => void;
  toggleTerminal: () => void;
  closeTerminal: () => void;
  addTerminalTab: (label?: string, prompt?: string) => void;
  removeTerminalTab: (id: string) => void;
  setActiveTerminalTab: (id: string) => void;
  openAgentTab: (taskTitle: string, prompt: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiPanelCollapsed: (collapsed: boolean) => void;
  setCabinetVisibilityMode: (
    cabinetPath: string,
    mode: CabinetVisibilityMode
  ) => void;
  setTaskPanelConversation: (conversation: ConversationMeta | null) => void;
}

function normalizeVisibilityCabinetPath(cabinetPath?: string): string {
  return cabinetPath?.trim() || ROOT_CABINET_PATH;
}

function loadCabinetVisibilityModes(): Record<string, CabinetVisibilityMode> {
  if (typeof window === "undefined") {
    return { [ROOT_CABINET_PATH]: "own" };
  }
  try {
    const stored = window.localStorage.getItem(CABINET_VISIBILITY_STORAGE_KEY);
    if (!stored) {
      return { [ROOT_CABINET_PATH]: "own" };
    }

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const next: Record<string, CabinetVisibilityMode> = {};

    for (const [cabinetPath, value] of Object.entries(parsed)) {
      if (
        value === "children-1" ||
        value === "children-2" ||
        value === "all" ||
        value === "own"
      ) {
        next[normalizeVisibilityCabinetPath(cabinetPath)] = value;
      }
    }

    return Object.keys(next).length > 0
      ? next
      : { [ROOT_CABINET_PATH]: "own" };
  } catch {
    return { [ROOT_CABINET_PATH]: "own" };
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  section: { type: "home" },
  terminalOpen: false,
  terminalTabs: [],
  activeTerminalTab: null,
  sidebarCollapsed: false,
  aiPanelCollapsed: false,
  cabinetVisibilityModes: loadCabinetVisibilityModes(),
  taskPanelConversation: null,

  setSection: (section) => set({ section, taskPanelConversation: null }),

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
  setCabinetVisibilityMode: (cabinetPath, mode) => {
    const normalizedCabinetPath = normalizeVisibilityCabinetPath(cabinetPath);
    const nextModes = {
      ...get().cabinetVisibilityModes,
      [normalizedCabinetPath]: mode,
    };
    try {
      window.localStorage.setItem(
        CABINET_VISIBILITY_STORAGE_KEY,
        JSON.stringify(nextModes)
      );
    } catch {
      // ignore storage failures
    }
    set({ cabinetVisibilityModes: nextModes });
  },

  setTaskPanelConversation: (conversation) => set({ taskPanelConversation: conversation }),

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
