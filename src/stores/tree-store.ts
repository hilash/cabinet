import { create } from "zustand";
import type { TreeNode } from "@/types";
import {
  fetchTree,
  createPageApi,
  deletePageApi,
  movePageApi,
  renamePageApi,
} from "@/lib/api/client";

export type DragZone = "before" | "into" | "after";

interface TreeState {
  nodes: TreeNode[];
  selectedPath: string | null;
  expandedPaths: Set<string>;
  loading: boolean;
  dragOverPath: string | null;
  dragOverZone: DragZone | null;
  movingPaths: Set<string>;
  showHiddenFiles: boolean;
  /** Bumped whenever we want the sidebar to scroll to + blink the selected row. */
  focusTick: number;

  loadTree: () => Promise<void>;
  selectPage: (path: string | null) => void;
  /** Expand all ancestor paths, select the leaf, and bump focusTick. */
  focusPath: (path: string) => void;
  toggleExpand: (path: string) => void;
  expandPath: (path: string) => void;
  createPage: (parentPath: string, title: string) => Promise<void>;
  deletePage: (path: string) => Promise<void>;
  movePage: (
    fromPath: string,
    toParentPath: string,
    neighbors?: { prevName?: string | null; nextName?: string | null }
  ) => Promise<void>;
  renamePage: (path: string, newName: string) => Promise<void>;
  setDragOver: (path: string | null, zone?: DragZone | null) => void;
  setShowHiddenFiles: (show: boolean) => void;
  toggleHiddenFiles: () => void;
}

const TREE_CACHE_KEY = "kb-tree-cache";

function loadExpandedPaths(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("kb-expanded-paths");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function loadShowHiddenFiles(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("kb-show-hidden-files") === "true";
  } catch {
    return false;
  }
}

function saveExpandedPaths(paths: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("kb-expanded-paths", JSON.stringify([...paths]));
}

function loadCachedTree(showHidden: boolean): TreeNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TREE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { showHidden: boolean; nodes: TreeNode[] };
    if (parsed.showHidden !== showHidden) return [];
    return Array.isArray(parsed.nodes) ? parsed.nodes : [];
  } catch {
    return [];
  }
}

function saveCachedTree(nodes: TreeNode[], showHidden: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      TREE_CACHE_KEY,
      JSON.stringify({ showHidden, nodes })
    );
  } catch {
    // quota errors are non-fatal; skip caching
  }
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  selectedPath: null,
  expandedPaths: loadExpandedPaths(),
  loading: false,
  dragOverPath: null,
  dragOverZone: null,
  movingPaths: new Set<string>(),
  showHiddenFiles: loadShowHiddenFiles(),
  focusTick: 0,

  loadTree: async () => {
    const { showHiddenFiles, nodes: existing } = get();
    // Paint instantly from cache on first load, then revalidate in the
    // background. Keeps the sidebar from flashing empty on refresh.
    if (existing.length === 0) {
      const cached = loadCachedTree(showHiddenFiles);
      if (cached.length > 0) {
        set({ nodes: cached, loading: false });
      } else {
        set({ loading: true });
      }
    }
    try {
      const nodes = await fetchTree(showHiddenFiles);
      set({ nodes, loading: false });
      saveCachedTree(nodes, showHiddenFiles);
    } catch {
      set({ loading: false });
    }
  },

  selectPage: (path: string | null) => {
    set({ selectedPath: path });
  },

  focusPath: (path: string) => {
    const { expandedPaths, focusTick } = get();
    const next = new Set(expandedPaths);
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      next.add(parts.slice(0, i).join("/"));
    }
    set({ selectedPath: path, expandedPaths: next, focusTick: focusTick + 1 });
    saveExpandedPaths(next);
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

  movePage: async (
    fromPath: string,
    toParentPath: string,
    neighbors: { prevName?: string | null; nextName?: string | null } = {}
  ) => {
    const fromParent = fromPath.split("/").slice(0, -1).join("/");
    const sameParent =
      fromParent === toParentPath &&
      neighbors.prevName === undefined &&
      neighbors.nextName === undefined;
    if (sameParent) return;

    set((state) => {
      const next = new Set(state.movingPaths);
      next.add(fromPath);
      return { movingPaths: next };
    });
    try {
      const newPath = await movePageApi(fromPath, toParentPath, neighbors);
      if (toParentPath) {
        get().expandPath(toParentPath);
      }
      await get().loadTree();
      set({ selectedPath: newPath });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cabinet:toast", {
            detail: { kind: "info", message: `Moved to ${toParentPath || "root"}` },
          })
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to move page";
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cabinet:toast", {
            detail: { kind: "error", message },
          })
        );
      }
      // Toast is the user-facing surface; no console.error so a name
      // collision (or any other server-validated message) doesn't trip
      // the Next.js dev-tools error overlay.
    } finally {
      set((state) => {
        const next = new Set(state.movingPaths);
        next.delete(fromPath);
        return { movingPaths: next };
      });
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

  setDragOver: (path: string | null, zone: DragZone | null = null) => {
    set({ dragOverPath: path, dragOverZone: path ? zone : null });
  },

  setShowHiddenFiles: (show: boolean) => {
    set({ showHiddenFiles: show });
    localStorage.setItem("kb-show-hidden-files", String(show));
    get().loadTree();
  },

  toggleHiddenFiles: () => {
    const { showHiddenFiles } = get();
    get().setShowHiddenFiles(!showHiddenFiles);
  },
}));
