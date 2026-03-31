import { create } from "zustand";
import type { TreeNode } from "@/types";
import {
  fetchTree,
  createPageApi,
  deletePageApi,
  movePageApi,
  renamePageApi,
} from "@/lib/api/client";

interface TreeState {
  nodes: TreeNode[];
  selectedPath: string | null;
  expandedPaths: Set<string>;
  loading: boolean;
  dragOverPath: string | null;

  loadTree: () => Promise<void>;
  selectPage: (path: string) => void;
  toggleExpand: (path: string) => void;
  expandPath: (path: string) => void;
  createPage: (parentPath: string, title: string) => Promise<void>;
  deletePage: (path: string) => Promise<void>;
  movePage: (fromPath: string, toParentPath: string) => Promise<void>;
  renamePage: (path: string, newName: string) => Promise<void>;
  setDragOver: (path: string | null) => void;
}

function loadExpandedPaths(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("kb-expanded-paths");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveExpandedPaths(paths: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("kb-expanded-paths", JSON.stringify([...paths]));
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  selectedPath: null,
  expandedPaths: loadExpandedPaths(),
  loading: false,
  dragOverPath: null,

  loadTree: async () => {
    set({ loading: true });
    try {
      const nodes = await fetchTree();
      set({ nodes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectPage: (path: string) => {
    set({ selectedPath: path });
  },

  toggleExpand: (path: string) => {
    const { expandedPaths } = get();
    const next = new Set(expandedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ expandedPaths: next });
    saveExpandedPaths(next);
  },

  expandPath: (path: string) => {
    const { expandedPaths } = get();
    if (!expandedPaths.has(path)) {
      const next = new Set(expandedPaths);
      next.add(path);
      set({ expandedPaths: next });
      saveExpandedPaths(next);
    }
  },

  createPage: async (parentPath: string, title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fullPath = parentPath ? `${parentPath}/${slug}` : slug;
    await createPageApi(fullPath, title);
    if (parentPath) {
      get().expandPath(parentPath);
    }
    await get().loadTree();
    set({ selectedPath: fullPath });
  },

  deletePage: async (path: string) => {
    await deletePageApi(path);
    const { selectedPath } = get();
    if (selectedPath === path) {
      set({ selectedPath: null });
    }
    await get().loadTree();
  },

  movePage: async (fromPath: string, toParentPath: string) => {
    try {
      const newPath = await movePageApi(fromPath, toParentPath);
      if (toParentPath) {
        get().expandPath(toParentPath);
      }
      await get().loadTree();
      const { selectedPath } = get();
      if (selectedPath === fromPath) {
        set({ selectedPath: newPath });
      }
    } catch (error) {
      console.error("Failed to move page:", error);
    }
  },

  renamePage: async (pagePath: string, newName: string) => {
    try {
      const newPath = await renamePageApi(pagePath, newName);
      await get().loadTree();
      const { selectedPath } = get();
      if (selectedPath === pagePath) {
        set({ selectedPath: newPath });
      }
    } catch (error) {
      console.error("Failed to rename page:", error);
    }
  },

  setDragOver: (path: string | null) => {
    set({ dragOverPath: path });
  },
}));
