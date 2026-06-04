"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Cloud, ChevronRight, ChevronDown, RefreshCw, Settings, Folder, Loader2, FolderOpen, ClipboardCopy } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import type { TreeNode, GoogleDriveSection } from "@/types";
import { cn } from "@/lib/utils";
import { decodeDrivePath } from "@/lib/google-drive/paths";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const DRIVE_CACHE_KEY = "gdrive-tree-cache";
const DRIVE_EXPANDED_KEY = "gdrive-expanded-paths";
// 60-second TTL for Drive tree
const CACHE_TTL_MS = 60_000;

function loadExpandedPaths(): Set<string> {
  try {
    const raw = localStorage.getItem(DRIVE_EXPANDED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveExpandedPaths(paths: Set<string>) {
  try {
    localStorage.setItem(DRIVE_EXPANDED_KEY, JSON.stringify([...paths]));
  } catch { /* ignore */ }
}

interface DriveNodeProps {
  node: TreeNode;
  depth: number;
  padFn: (depth: number) => React.CSSProperties;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function DriveNode({ node, depth, padFn, expandedPaths, onToggle }: DriveNodeProps) {
  const selectPage = useTreeStore((s) => s.selectPage);
  const setDriveNode = useTreeStore((s) => s.setDriveNode);
  const setDriveLoading = useTreeStore((s) => s.setDriveLoading);
  const setSection = useAppStore((s) => s.setSection);
  const selectedPath = useTreeStore((s) => s.selectedPath);

  const driveLoading = useTreeStore((s) => s.driveLoading);
  const isDir = node.type === "directory";
  const expanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isLoading = isSelected && driveLoading;

  const handleClick = () => {
    if (isDir) {
      onToggle(node.path);
      return;
    }
    // Store the Drive node so app-shell can render it without going through
    // the local page loader (which knows nothing about gdrive: paths).
    selectPage(node.path);
    setDriveNode(node);
    setDriveLoading(true);
    setSection({ type: "page" });
  };

  const childrenId = isDir ? `gdrive-children-${node.path.replace(/[^a-z0-9]/gi, "-")}` : undefined;
  const absPath = decodeDrivePath(node.path);

  const doCopyFullPath = () => {
    if (absPath) void navigator.clipboard.writeText(absPath);
  };

  const doReveal = () => {
    if (!absPath) return;
    void fetch("/api/google-drive/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: node.path }),
    });
  };

  return (
    <div>
      <ContextMenu>
      <ContextMenuTrigger>
      <button
        type="button"
        onClick={handleClick}
        style={padFn(depth)}
        aria-expanded={isDir ? expanded : undefined}
        aria-controls={isDir ? childrenId : undefined}
        className={cn(
          "flex w-full items-center gap-1.5 py-1 px-2 text-[12px] text-foreground/75 rounded-md transition-colors cursor-pointer text-left",
          "hover:bg-foreground/[0.03] hover:text-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
      >
        {isDir ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground/60" />
        ) : isDir ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
        ) : node.frontmatter?.google?.kind === "docs" ? (
          <span className="text-[10px] shrink-0">📄</span>
        ) : node.frontmatter?.google?.kind === "sheets" ? (
          <span className="text-[10px] shrink-0">📊</span>
        ) : node.frontmatter?.google?.kind === "slides" ? (
          <span className="text-[10px] shrink-0">📑</span>
        ) : (
          <span className="text-[10px] shrink-0">📄</span>
        )}

        <span className="min-w-0 flex-1 truncate">
          {node.frontmatter?.title || node.name}
        </span>

        {/* Read-only badge for native Google formats */}
        {node.frontmatter?.google && (
          <span className="shrink-0 text-[9px] text-muted-foreground/50 font-mono">
            view
          </span>
        )}
      </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={doCopyFullPath}>
          <ClipboardCopy className="h-4 w-4 me-2" />
          Copy Full Path
        </ContextMenuItem>
        <ContextMenuItem onClick={doReveal}>
          <FolderOpen className="h-4 w-4 me-2" />
          Reveal in File Manager
        </ContextMenuItem>
      </ContextMenuContent>
      </ContextMenu>

      {isDir && expanded && node.children && node.children.length > 0 && (
        <div id={childrenId}>
          {node.children.map((child) => (
            <DriveNode
              key={child.path}
              node={child}
              depth={depth + 1}
              padFn={padFn}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GoogleDriveTreeSectionProps {
  depth: number;
  padFn: (depth: number) => React.CSSProperties;
  itemClass: (active: boolean) => string;
}

export function GoogleDriveTreeSection({ depth, padFn }: GoogleDriveTreeSectionProps) {
  const setSection = useAppStore((s) => s.setSection);
  const [sections, setSections] = useState<GoogleDriveSection[]>([]);
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(loadExpandedPaths);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchDriveTree = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < CACHE_TTL_MS) return;

    // Paint from cache immediately
    if (sections.length === 0) {
      try {
        const cached = localStorage.getItem(DRIVE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as GoogleDriveSection[];
          setSections(parsed);
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch("/api/google-drive/tree", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { sections: GoogleDriveSection[] };
      setSections(data.sections);
      lastFetchRef.current = Date.now();
      // Expand new sections by default
      setSectionExpanded((prev) => {
        const next = { ...prev };
        for (const s of data.sections) {
          if (!(s.mountId in next)) next[s.mountId] = true;
        }
        return next;
      });
      try {
        localStorage.setItem(DRIVE_CACHE_KEY, JSON.stringify(data.sections));
      } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [sections.length]);

  useEffect(() => {
    void fetchDriveTree();
  }, [fetchDriveTree]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchDriveTree(true);
    } finally {
      setRefreshing(false);
    }
  };

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      saveExpandedPaths(next);
      return next;
    });
  };

  if (sections.length === 0) return null;

  return (
    <div className="mt-2">
      {/* Section divider */}
      <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5" style={padFn(0)}>
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1">
          <Cloud className="h-2.5 w-2.5" />
          Google Drive
        </span>
        <div className="h-px flex-1 bg-border/60" />
        <button
          type="button"
          title="Refresh Google Drive"
          onClick={refresh}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <RefreshCw className={cn("h-2.5 w-2.5", refreshing && "animate-spin")} />
        </button>
        <button
          type="button"
          title="Manage Google Drive"
          onClick={() => setSection({ type: "settings", slug: "integrations" })}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <Settings className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* One block per mount */}
      {sections.map((section) => {
        const expanded = sectionExpanded[section.mountId] ?? true;
        const mountChildrenId = `gdrive-mount-${section.mountId.replace(/[^a-z0-9]/gi, "-")}`;
        return (
          <div key={section.mountId}>
            <button
              type="button"
              style={padFn(depth)}
              aria-expanded={expanded}
              aria-controls={mountChildrenId}
              onClick={() =>
                setSectionExpanded((prev) => ({
                  ...prev,
                  [section.mountId]: !prev[section.mountId],
                }))
              }
              className="flex w-full items-center gap-1.5 py-1 px-2 text-[12px] text-foreground/60 hover:text-foreground rounded-md transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              )}
              <Cloud className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="min-w-0 flex-1 truncate font-medium">{section.folderName}</span>
            </button>

            {expanded && (
              <div id={mountChildrenId}>
                {section.children.map((node) => (
                  <DriveNode
                    key={node.path}
                    node={node}
                    depth={depth + 1}
                    padFn={padFn}
                    expandedPaths={expandedPaths}
                    onToggle={togglePath}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
