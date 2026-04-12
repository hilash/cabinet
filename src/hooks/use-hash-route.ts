"use client";

import { useEffect, useRef } from "react";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Sync app navigation state with URL hash + localStorage persistence.
 *
 * Hash format:
 *   #/home
 *   #/ops/agents
 *   #/ops/agents/{slug}
 *   #/cabinet/{cabinetPath}
 *   #/cabinet/{cabinetPath}/agents
 *   #/cabinet/{cabinetPath}/agents/{slug}
 *   #/cabinet/{cabinetPath}/jobs
 *   #/cabinet/{cabinetPath}/data/{pagePath}
 *   #/page/{pagePath}
 *   #/settings
 *   #/settings/{slug}
 */

const LS_KEY = "cabinet.last-route";

type SectionState = ReturnType<typeof useAppStore.getState>["section"];

interface RouteState {
  section: SectionState;
  pagePath: string | null;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function decodePathSegment(value?: string): string {
  if (!value) return ROOT_CABINET_PATH;
  try {
    return decodeURIComponent(value) || ROOT_CABINET_PATH;
  } catch {
    return value || ROOT_CABINET_PATH;
  }
}

function buildHash(section: SectionState, pagePath: string | null): string {
  if (section.type === "page" && section.mode === "cabinet" && section.cabinetPath && pagePath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/data/${encodePathSegment(pagePath)}`;
  }
  if (section.type === "page" && pagePath) {
    return `#/page/${encodePathSegment(pagePath)}`;
  }
  if (section.type === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}`;
  }
  if (section.type === "agent" && section.mode === "cabinet" && section.cabinetPath && section.slug) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/agents/${encodePathSegment(section.slug)}`;
  }
  if (section.type === "agents" && section.mode === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/agents`;
  }
  if (section.type === "jobs" && section.mode === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/jobs`;
  }
  if (section.type === "agent" && section.slug) {
    return `#/ops/agents/${encodePathSegment(section.slug)}`;
  }
  if (section.type === "agents") {
    return "#/ops/agents";
  }
  if (section.type === "settings") {
    return section.slug
      ? `#/settings/${encodePathSegment(section.slug)}`
      : "#/settings";
  }
  if (section.type === "home") return "#/home";
  return "#/home";
}

function parseHash(hash: string): RouteState {
  const raw = hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] === "home") {
    return { section: { type: "home" }, pagePath: null };
  }

  if (parts[0] === "page") {
    return {
      section: { type: "page" },
      pagePath: decodePathSegment(parts.slice(1).join("/")),
    };
  }

  if (parts[0] === "ops") {
    if (parts[1] === "agents" && parts[2]) {
      return {
        section: {
          type: "agent",
          mode: "ops",
          slug: decodePathSegment(parts[2]),
        },
        pagePath: null,
      };
    }

    if (parts[1] === "agents") {
      return {
        section: { type: "agents", mode: "ops" },
        pagePath: null,
      };
    }
  }

  if (parts[0] === "cabinet") {
    const cabinetPath = decodePathSegment(parts[1]);
    const leaf = parts[2];

    if (!leaf) {
      return {
        section: { type: "cabinet", mode: "cabinet", cabinetPath },
        pagePath: null,
      };
    }

    if (leaf === "agents" && parts[3]) {
      const slug = decodePathSegment(parts[3]);
      return {
        section: {
          type: "agent",
          mode: "cabinet",
          cabinetPath,
          slug,
          agentScopedId: `${cabinetPath}::agent::${slug}`,
        },
        pagePath: null,
      };
    }

    if (leaf === "agents") {
      return {
        section: { type: "agents", mode: "cabinet", cabinetPath },
        pagePath: null,
      };
    }

    if (leaf === "jobs") {
      return {
        section: { type: "jobs", mode: "cabinet", cabinetPath },
        pagePath: null,
      };
    }

    if (leaf === "data" && parts[3]) {
      const pagePath = decodePathSegment(parts.slice(3).join("/"));
      return {
        section: { type: "page", mode: "cabinet", cabinetPath },
        pagePath,
      };
    }
  }

  if (parts[0] === "settings") {
    return {
      section: {
        type: "settings",
        slug: parts[1] ? decodePathSegment(parts[1]) : undefined,
      },
      pagePath: null,
    };
  }

  return { section: { type: "home" }, pagePath: null };
}

function saveToLocalStorage(hash: string) {
  try {
    localStorage.setItem(LS_KEY, hash);
  } catch {
    // ignore storage failures
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
  const parts = pagePath.split("/").filter(Boolean);
  const expandPath = useTreeStore.getState().expandPath;
  for (let i = 1; i < parts.length; i++) {
    expandPath(parts.slice(0, i).join("/"));
  }
}

async function applyRoute(route: RouteState) {
  const { setSection } = useAppStore.getState();
  const { selectPage } = useTreeStore.getState();
  const { loadPage, clear } = useEditorStore.getState();

  setSection(route.section);

  if (route.pagePath) {
    selectPage(route.pagePath);
    await loadPage(route.pagePath);
    expandParents(route.pagePath);
    return;
  }

  if (route.section.mode === "cabinet" && route.section.cabinetPath) {
    selectPage(route.section.cabinetPath);
    await loadPage(route.section.cabinetPath);
    if (route.section.cabinetPath !== ROOT_CABINET_PATH) {
      expandParents(route.section.cabinetPath);
    }
    return;
  }

  selectPage(null);
  clear();
}

export function useHashRoute() {
  const suppressHashUpdate = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    let route: RouteState;

    if (hash && hash !== "#" && hash !== "#/") {
      route = parseHash(hash);
    } else {
      const saved = loadFromLocalStorage();
      if (saved) {
        route = parseHash(saved);
        window.history.replaceState(null, "", saved);
      } else {
        route = { section: { type: "home" }, pagePath: null };
      }
    }

    suppressHashUpdate.current = true;
    void applyRoute(route).finally(() => {
      requestAnimationFrame(() => {
        suppressHashUpdate.current = false;
      });
    });
  }, []);

  useEffect(() => {
    const unsubApp = useAppStore.subscribe((state, prev) => {
      if (suppressHashUpdate.current) return;

      if (
        state.section.type !== prev.section.type ||
        state.section.slug !== prev.section.slug ||
        state.section.mode !== prev.section.mode ||
        state.section.cabinetPath !== prev.section.cabinetPath
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
        const hash = buildHash(useAppStore.getState().section, state.selectedPath);
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

  useEffect(() => {
    function onHashChange() {
      const route = parseHash(window.location.hash);
      suppressHashUpdate.current = true;
      void applyRoute(route).finally(() => {
        saveToLocalStorage(window.location.hash);
        requestAnimationFrame(() => {
          suppressHashUpdate.current = false;
        });
      });
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
}
