"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import type { SelectedSection } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Sync app navigation state with the URL hash + localStorage persistence.
 *
 * Hash format:
 *   #/agents          → agents workspace
 *   #/agents/{slug}   → specific agent
 *   #/jobs            → jobs manager
 *   #/settings        → settings
 *   #/page/{path}     → KB page  (e.g. #/page/folder/subfolder)
 *
 * Priority on load: hash > localStorage > default (agents)
 */

const LS_KEY = "cabinet.last-route";

interface RouteState {
  section: SelectedSection;
  pagePath: string | null;
}

function buildHash(section: SelectedSection, pagePath: string | null): string {
  if (section.type === "page" && pagePath) return `#/page/${pagePath}`;
  if (section.type === "agent" && section.slug) return `#/agents/${section.slug}`;
  if (section.type === "issues") return "#/issues";
  if (section.type === "issue-detail" && section.id) return `#/issues/${section.id}`;
  if (section.type === "projects") return "#/projects";
  if (section.type === "project-detail" && section.id) return `#/projects/${section.id}`;
  if (section.type === "agents-multica") return "#/multica-agents";
  if (section.type === "agent-multica" && section.slug) return `#/multica-agents/${section.slug}`;
  if (section.type === "inbox") return "#/inbox";
  if (section.type === "my-issues") return "#/my-issues";
  if (section.type === "runtimes") return "#/runtimes";
  if (section.type === "skills") return "#/skills";
  if (section.type === "multica-settings") return "#/multica-settings";
  if (section.type === "home") return "#/home";
  if (section.type === "agents") return "#/agents";
  if (section.type === "jobs") return "#/jobs";
  if (section.type === "settings") return section.slug ? `#/settings/${section.slug}` : "#/settings";
  return "#/home";
}

function parseHash(hash: string): RouteState {
  const raw = hash.replace(/^#\/?/, "");
  if (!raw || raw === "home") return { section: { type: "home" }, pagePath: null };

  if (raw.startsWith("page/")) {
    const pagePath = raw.slice("page/".length);
    return { section: { type: "page" }, pagePath: pagePath || null };
  }
  if (raw.startsWith("issues/")) {
    const id = raw.slice("issues/".length);
    return { section: { type: "issue-detail", id }, pagePath: null };
  }
  if (raw === "issues") return { section: { type: "issues" }, pagePath: null };
  if (raw.startsWith("projects/")) {
    const id = raw.slice("projects/".length);
    return { section: { type: "project-detail", id }, pagePath: null };
  }
  if (raw === "projects") return { section: { type: "projects" }, pagePath: null };
  if (raw.startsWith("agents/")) {
    const slug = raw.slice("agents/".length);
    return { section: { type: "agent", slug }, pagePath: null };
  }
  if (raw.startsWith("multica-agents/")) {
    const slug = raw.slice("multica-agents/".length);
    return { section: { type: "agent-multica", slug }, pagePath: null };
  }
  if (raw === "agents") return { section: { type: "agents" }, pagePath: null };
  if (raw === "multica-agents") return { section: { type: "agents-multica" }, pagePath: null };
  if (raw === "inbox") return { section: { type: "inbox" }, pagePath: null };
  if (raw === "my-issues") return { section: { type: "my-issues" }, pagePath: null };
  if (raw === "runtimes") return { section: { type: "runtimes" }, pagePath: null };
  if (raw === "skills") return { section: { type: "skills" }, pagePath: null };
  if (raw === "multica-settings") return { section: { type: "multica-settings" }, pagePath: null };
  if (raw === "jobs") return { section: { type: "jobs" }, pagePath: null };
  if (raw === "settings") return { section: { type: "settings" }, pagePath: null };
  if (raw.startsWith("settings/")) {
    const slug = raw.slice("settings/".length);
    return { section: { type: "settings", slug }, pagePath: null };
  }

  return { section: { type: "home" }, pagePath: null };
}

function saveToLocalStorage(hash: string) {
  try {
    localStorage.setItem(LS_KEY, hash);
  } catch {
    // quota exceeded or private browsing
  }
}

function loadFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function expandParents(pagePath: string) {
  const parts = pagePath.split("/");
  const expandPath = useTreeStore.getState().expandPath;
  for (let i = 1; i < parts.length; i++) {
    expandPath(parts.slice(0, i).join("/"));
  }
}

function applyRoute(route: RouteState) {
  useAppStore.getState().setSection(route.section);
  if (route.pagePath) {
    useTreeStore.getState().selectPage(route.pagePath);
    useEditorStore.getState().loadPage(route.pagePath);
    expandParents(route.pagePath);
  }
}

export function useHashRoute() {
  const suppressHashUpdate = useRef(false);

  // On mount: hash > localStorage > default
  useEffect(() => {
    const hash = window.location.hash;
    let route: RouteState;

    if (hash && hash !== "#" && hash !== "#/") {
      route = parseHash(hash);
    } else {
      const saved = loadFromLocalStorage();
      if (saved) {
        route = parseHash(saved);
        // Reflect restored route in the URL
        window.history.replaceState(null, "", saved);
      } else {
        route = { section: { type: "home" }, pagePath: null };
      }
    }

    suppressHashUpdate.current = true;
    applyRoute(route);

    requestAnimationFrame(() => {
      suppressHashUpdate.current = false;
    });
  }, []);

  // Store changes → update hash + localStorage
  useEffect(() => {
    const unsubApp = useAppStore.subscribe((state, prev) => {
      if (suppressHashUpdate.current) return;
      if (
        state.section.type !== prev.section.type ||
        state.section.slug !== prev.section.slug ||
        state.section.id !== prev.section.id
      ) {
        const selectedPath = useTreeStore.getState().selectedPath;
        const hash = buildHash(state.section, selectedPath);
        if (window.location.hash !== hash) {
          window.history.replaceState(null, "", hash);
          saveToLocalStorage(hash);
        }
      }
    });

    const unsubTree = useTreeStore.subscribe((state, prev) => {
      if (suppressHashUpdate.current) return;
      if (state.selectedPath !== prev.selectedPath && state.selectedPath) {
        const hash = `#/page/${state.selectedPath}`;
        if (window.location.hash !== hash) {
          window.history.replaceState(null, "", hash);
          saveToLocalStorage(hash);
        }
      }
    });

    return () => {
      unsubApp();
      unsubTree();
    };
  }, []);

  // Browser back/forward → update state
  useEffect(() => {
    function onHashChange() {
      const route = parseHash(window.location.hash);
      suppressHashUpdate.current = true;
      applyRoute(route);
      saveToLocalStorage(window.location.hash);
      requestAnimationFrame(() => {
        suppressHashUpdate.current = false;
      });
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
}
