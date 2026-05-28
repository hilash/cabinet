"use client";

import { useMemo, type ReactNode } from "react";
import { Archive, Globe, Layout } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { NavArrows } from "@/components/layout/nav-arrows";
import { ReturnToChip } from "@/components/layout/return-to-chip";
import { ViewerBreadcrumb } from "@/components/layout/viewer-breadcrumb";
import { NewTaskButton } from "@/components/composer/new-task-button";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { useLocale } from "@/i18n/use-locale";
import { findNodeByPath } from "@/lib/cabinets/tree";
import { cn } from "@/lib/utils";

/**
 * Unified toolbar used by every file viewer (PDF, CSV, source, office, media,
 * mermaid, image, embedded website/app, and the markdown editor). Replaces the
 * former stack of ReturnToBanner + separate breadcrumb row + per-viewer title
 * chip with a single row:
 *
 *   [Back to …]  [breadcrumb > file] [BADGE] [sublabel]        [actions] [HeaderActions]
 *
 * Pass viewer-specific actions (Wrap/Copy/Download/Raw etc.) as `children` —
 * they render immediately before the global `HeaderActions`.
 */
export function ViewerToolbar({
  path,
  badge,
  sublabel,
  showBreadcrumb = true,
  leading,
  children,
  className,
  showModeButtons = true,
}: {
  path?: string;
  badge?: string;
  sublabel?: string;
  showBreadcrumb?: boolean;
  /** Extra leading element (e.g. a viewer's own Back button for full-screen mode). */
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
  showModeButtons?: boolean;
}) {
  const { t } = useLocale();
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const nodes = useTreeStore((s) => s.nodes);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const sourcePath = path || selectedPath;
  const sourceNode = useMemo(
    () => (sourcePath ? findNodeByPath(nodes, sourcePath) : null),
    [nodes, sourcePath]
  );

  const browseModeUrl = useMemo(() => {
    if (!sourcePath) return null;
    const assetUrl = `/api/assets/${sourcePath.split("/").map(encodeURIComponent).join("/")}`;
    const lower = sourcePath.toLowerCase();
    if (sourceNode?.type === "website" || sourceNode?.type === "app") {
      return `${assetUrl}/index.html`;
    }
    if (sourceNode?.type === "directory" || sourceNode?.type === "cabinet") {
      return `${assetUrl}/index.md`;
    }
    if (sourceNode?.type === "file" || lower.endsWith(".md")) {
      return `${assetUrl}.md`;
    }
    return assetUrl;
  }, [sourcePath, sourceNode?.type]);

  const openBrowseMode = () => {
    setAppMode("browse", browseModeUrl);
  };

  const modeButtons = showModeButtons ? (
    <>
      {appMode === "edit" && (
        <>
          <button
            aria-label={t("editor:header.browseMode")}
            title={t("editor:header.browseMode")}
            onClick={openBrowseMode}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            aria-label={t("editor:header.canvasMode")}
            title={t("editor:header.canvasMode")}
            onClick={() => setAppMode("canvas")}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Layout className="h-4 w-4" />
          </button>
        </>
      )}
      {appMode === "browse" && (
        <>
          <button
            aria-label={t("editor:header.editMode")}
            title={t("editor:header.editMode")}
            onClick={() => setAppMode("edit")}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            aria-label={t("editor:header.canvasMode")}
            title={t("editor:header.canvasMode")}
            onClick={() => setAppMode("canvas")}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Layout className="h-4 w-4" />
          </button>
        </>
      )}
      {appMode === "canvas" && (
        <>
          <button
            aria-label={t("editor:header.editMode")}
            title={t("editor:header.editMode")}
            onClick={() => setAppMode("edit")}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            aria-label={t("editor:header.browseMode")}
            title={t("editor:header.browseMode")}
            onClick={openBrowseMode}
            className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          >
            <Globe className="h-4 w-4" />
          </button>
        </>
      )}
    </>
  ) : null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-x-3 gap-y-2 border-b border-border/70 bg-background px-4 py-2 transition-[padding] duration-200 md:h-12 md:py-0",
        className
      )}
      style={{ paddingInlineStart: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <ReturnToChip />
        {leading}
        {showBreadcrumb && path ? <ViewerBreadcrumb path={path} /> : null}
        {badge && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/50">
            {badge}
          </span>
        )}
        {sublabel && (
          <span className="hidden shrink-0 text-xs text-muted-foreground/40 sm:inline">
            {sublabel}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NavArrows />
        {children}
        {modeButtons}
        <HeaderActions />
        <NewTaskButton />
      </div>
    </div>
  );
}
