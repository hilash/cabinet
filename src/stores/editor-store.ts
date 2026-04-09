import { create } from "zustand";
import type { FrontMatter, SaveStatus } from "@/types";
import { fetchPage, savePage } from "@/lib/api/client";
import { useAppStore } from "./app-store";

interface EditorState {
  currentPath: string | null;
  content: string;
  frontmatter: FrontMatter | null;
  saveStatus: SaveStatus;
  isDirty: boolean;

  loadPage: (path: string) => Promise<void>;
  updateContent: (content: string) => void;
  updateFrontmatter: (updates: Partial<FrontMatter>) => void;
  save: () => Promise<void>;
  clear: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let statusTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditorStore = create<EditorState>((set, get) => ({
  currentPath: null,
  content: "",
  frontmatter: null,
  saveStatus: "idle",
  isDirty: false,

  loadPage: async (path: string) => {
    // Cancel any pending save for the previous page
    if (saveTimer) clearTimeout(saveTimer);
    if (statusTimer) clearTimeout(statusTimer);

    const teamSlug = useAppStore.getState().currentTeamSlug;
    try {
      const page = await fetchPage(path, teamSlug);
      set({
        currentPath: path,
        content: page.content,
        frontmatter: page.frontmatter,
        saveStatus: "idle",
        isDirty: false,
      });
    } catch {
      set({
        currentPath: path,
        content: "",
        frontmatter: null,
        saveStatus: "error",
        isDirty: false,
      });
    }
  },

  updateContent: (content: string) => {
    set({ content, isDirty: true });

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().save();
    }, 500);
  },

  updateFrontmatter: (updates: Partial<FrontMatter>) => {
    const { frontmatter } = get();
    if (!frontmatter) return;
    set({ frontmatter: { ...frontmatter, ...updates }, isDirty: true });

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().save();
    }, 500);
  },

  save: async () => {
    const { currentPath, content, frontmatter, isDirty } = get();
    if (!currentPath || !isDirty) return;

    set({ saveStatus: "saving" });
    try {
      const teamSlug = useAppStore.getState().currentTeamSlug;
      await savePage(currentPath, content, frontmatter || {}, teamSlug);
      set({ saveStatus: "saved", isDirty: false });

      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        set({ saveStatus: "idle" });
      }, 2000);
    } catch {
      set({ saveStatus: "error" });
    }
  },

  clear: () => {
    if (saveTimer) clearTimeout(saveTimer);
    if (statusTimer) clearTimeout(statusTimer);
    set({
      currentPath: null,
      content: "",
      frontmatter: null,
      saveStatus: "idle",
      isDirty: false,
    });
  },
}));
