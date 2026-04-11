"use client";

import { useState, useCallback } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Trash2,
  FilePlus,
  Globe,
  Pencil,
  AppWindow,
  GitBranch,
  FileType,
  Table,
  Copy,
  ClipboardCopy,
  Link2,
  Link2Off,
  Code,
  Image,
  Video,
  Music,
  Workflow,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode as TreeNodeType } from "@/types";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkRepoDialog } from "./link-repo-dialog";
import { getDataDir } from "@/lib/data-dir-cache";

interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
}

export function TreeNode({ node, depth }: TreeNodeProps) {
  const {
    selectedPath,
    expandedPaths,
    dragOverPath,
    toggleExpand,
    selectPage,
    deletePage,
    movePage,
    setDragOver,
    createPage,
    renamePage,
  } = useTreeStore();
  const loadPage = useEditorStore((s) => s.loadPage);
  const [subPageOpen, setSubPageOpen] = useState(false);
  const [subPageTitle, setSubPageTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);

  const isSelected = selectedPath === node.path;
  const isDragOver = dragOverPath === node.path;
  const hasChildren = !!(node.children && node.children.length > 0);
  const isExpanded = hasChildren && expandedPaths.has(node.path);
  const title = node.frontmatter?.title || node.name;

  const handleClick = () => {
    if (hasChildren) {
      toggleExpand(node.path);
    }
    selectPage(node.path);
    if (node.type === "file" || node.type === "directory") {
      loadPage(node.path);
    }
  };

  const handleDelete = () => {
    const message = node.isLinked
      ? `Unlink "${title}"? This removes the link but does not delete the original folder.`
      : `Delete "${title}"?`;
    if (confirm(message)) {
      deletePage(node.path);
    }
  };

  const handleCreateSubPage = async () => {
    if (!subPageTitle.trim()) return;
    setCreating(true);
    try {
      await createPage(node.path, subPageTitle.trim());
      const slug = subPageTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      loadPage(`${node.path}/${slug}`);
      setSubPageTitle("");
      setSubPageOpen(false);
    } catch (error) {
      console.error("Failed to create sub page:", error);
    } finally {
      setCreating(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", node.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.path]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOver(node.path);
    },
    [node.path, setDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverPath === node.path) {
        setDragOver(null);
      }
    },
    [node.path, dragOverPath, setDragOver]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);

      const fromPath = e.dataTransfer.getData("text/plain");
      if (!fromPath || fromPath === node.path) return;

      // Don't drop onto own children
      if (fromPath.startsWith(node.path + "/")) return;

      // Drop onto this node's path (it becomes the parent)
      const isDir = node.type === "directory";
      const targetParent = isDir ? node.path : node.path.split("/").slice(0, -1).join("/");
      if (fromPath === targetParent) return;

      movePage(fromPath, targetParent);
    },
    [node.path, node.type, movePage, setDragOver]
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            onClick={handleClick}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-1.5 w-full text-left py-1.5 px-2 text-[13px] rounded-md transition-colors",
              "hover:bg-accent/50 cursor-grab active:cursor-grabbing",
              isSelected && "bg-accent text-accent-foreground font-medium",
              isDragOver &&
                "bg-primary/10 ring-1 ring-primary/30 ring-inset"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
                  isExpanded && "rotate-90"
                )}
              />
            ) : (
              <span className="w-3.5" />
            )}
            {node.type === "csv" ? (
              <Table className="h-4 w-4 shrink-0 text-green-400" />
            ) : node.type === "pdf" ? (
              <FileType className="h-4 w-4 shrink-0 text-red-400" />
            ) : node.type === "app" ? (
              <AppWindow className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : node.type === "website" ? (
              <Globe className="h-4 w-4 shrink-0 text-blue-400" />
            ) : node.type === "code" ? (
              <Code className="h-4 w-4 shrink-0 text-violet-400" />
            ) : node.type === "image" ? (
              <Image className="h-4 w-4 shrink-0 text-pink-400" />
            ) : node.type === "video" ? (
              <Video className="h-4 w-4 shrink-0 text-cyan-400" />
            ) : node.type === "audio" ? (
              <Music className="h-4 w-4 shrink-0 text-amber-400" />
            ) : node.type === "mermaid" ? (
              <Workflow className="h-4 w-4 shrink-0 text-teal-400" />
            ) : node.type === "unknown" ? (
              <File className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            ) : node.hasRepo ? (
              <GitBranch className="h-4 w-4 shrink-0 text-orange-400" />
            ) : node.isLinked ? (
              <Link2 className="h-4 w-4 shrink-0 text-blue-400" />
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              )
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn("truncate", node.type === "unknown" && "opacity-50")}>{title}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setSubPageOpen(true)}>
            <FilePlus className="h-4 w-4 mr-2" />
            Add Sub Page
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setLinkRepoOpen(true)}>
            <GitBranch className="h-4 w-4 mr-2" />
            Load Knowledge
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setRenameTitle(title); setRenameOpen(true); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(node.path)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Relative Path
          </ContextMenuItem>
          <ContextMenuItem onClick={async () => {
            const dir = await getDataDir();
            navigator.clipboard.writeText(`${dir}/${node.path}`);
          }}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy Full Path
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            fetch("/api/system/open-data-dir", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subpath: node.path }),
            });
          }}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open in Finder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            {node.isLinked ? (
              <Link2Off className="h-4 w-4 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {node.isLinked ? "Unlink" : "Delete"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      <Dialog open={subPageOpen} onOpenChange={setSubPageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Sub Page to &ldquo;{title}&rdquo;
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateSubPage();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Page title..."
              value={subPageTitle}
              onChange={(e) => setSubPageTitle(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={!subPageTitle.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!renameTitle.trim()) return;
              await renamePage(node.path, renameTitle.trim());
              setRenameOpen(false);
            }}
            className="flex gap-2"
          >
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              autoFocus
            />
            <Button type="submit" disabled={!renameTitle.trim()}>
              Rename
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <LinkRepoDialog open={linkRepoOpen} onOpenChange={setLinkRepoOpen} parentPath={node.path} />
    </>
  );
}
