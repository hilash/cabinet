"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { findNodeByPath } from "@/lib/cabinets/tree";
import { fetchPage } from "@/lib/api/client";
import type { TreeNode } from "@/types";
import { useLocale } from "@/i18n/use-locale";

function flattenPages(nodes: TreeNode[] | undefined): TreeNode[] {
  const pages: TreeNode[] = [];
  if (!nodes) return pages;
  for (const node of nodes) {
    if (node.type === "directory" || node.type === "cabinet") {
      pages.push(...flattenPages(node.children));
      continue;
    }
    pages.push(node);
  }
  return pages;
}

function flattenCabinets(nodes: TreeNode[] | undefined): TreeNode[] {
  const cabinets: TreeNode[] = [];
  if (!nodes) return cabinets;
  for (const node of nodes) {
    if (node.type !== "cabinet") continue;
    cabinets.push(node);
    cabinets.push(...flattenCabinets(node.children));
  }
  return cabinets;
}

export function CanvasView() {
  const { t } = useLocale();
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const nodes = useTreeStore((s) => s.nodes);
  const selectPage = useTreeStore((s) => s.selectPage);
  const loadPage = useEditorStore((s) => s.loadPage);

  const cabinetPath = section.cabinetPath || ROOT_CABINET_PATH;
  const activeCabinet = useMemo(
    () => (cabinetPath ? findNodeByPath(nodes, cabinetPath) : null),
    [cabinetPath, nodes]
  );

  const scopeNodes = activeCabinet?.children ?? nodes;

  const pages = useMemo(() => flattenPages(scopeNodes).slice(0, 200), [scopeNodes]);
  const cabinets = useMemo(() => flattenCabinets(scopeNodes).slice(0, 200), [scopeNodes]);

  const [pageContentByPath, setPageContentByPath] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    if (pages.length === 0) {
      setPageContentByPath({});
      return;
    }

    void (async () => {
      const entries = await Promise.all(
        pages.map(async (page) => {
          try {
            const data = await fetchPage(page.path);
            return [page.path, data.content] as const;
          } catch {
            return [page.path, ""] as const;
          }
        })
      );

      if (cancelled) return;

      setPageContentByPath(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [pages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 flex-col">
        <div className="mb-4 flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{t("editor:canvas.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("editor:canvas.openPage")}</p>
          </div>
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {cabinetPath === ROOT_CABINET_PATH ? "root" : cabinetPath}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
          {pages.length === 0 && cabinets.length === 0 ? (
            <div className="mb-4 rounded-3xl border border-border/70 bg-muted p-8 text-center text-sm text-muted-foreground">
              {t("editor:canvas.empty")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cabinets.map((cabinet) => {
                const title = cabinet.frontmatter?.title || cabinet.name;
                return (
                  <button
                    key={`cabinet-${cabinet.path}`}
                    onClick={() => {
                      selectPage(cabinet.path);
                      void loadPage(cabinet.path);
                      setSection({ type: "page", cabinetPath: cabinet.path });
                    }}
                    className="flex h-64 flex-col rounded-2xl border border-border/70 bg-muted/40 p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Cabinet</div>
                    <div className="line-clamp-2 text-base font-semibold">{title}</div>
                    <div className="mt-2 text-xs text-muted-foreground">{cabinet.path}</div>
                    <div className="mt-auto text-sm text-muted-foreground">Open cabinet</div>
                  </button>
                );
              })}

              {pages.map((page) => {
                const title = page.frontmatter?.title || page.name;
                const content = pageContentByPath[page.path] ?? "";
                return (
                  <button
                    key={`page-${page.path}`}
                    onClick={() => {
                      selectPage(page.path);
                      void loadPage(page.path);
                    }}
                    className="flex h-64 flex-col rounded-2xl border border-border/70 bg-background p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="mb-2 line-clamp-2 text-base font-semibold">{title}</div>
                    <div className="mb-2 text-xs text-muted-foreground">{page.path}</div>
                    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-muted/40 p-3 text-xs text-foreground/90">
                      {content}
                    </pre>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
