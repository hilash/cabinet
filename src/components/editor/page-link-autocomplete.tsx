"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface FlatPage {
  title: string;
  path: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: string;
  frontmatter?: { title?: string };
  children?: TreeNode[];
}

function flattenTree(nodes: TreeNode[]): FlatPage[] {
  const result: FlatPage[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.type === "file" || node.type === "directory") {
        result.push({
          title: node.frontmatter?.title || node.name,
          path: node.path,
        });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

interface PageLinkAutocompleteProps {
  editor: Editor | null;
}

export function PageLinkAutocomplete({ editor }: PageLinkAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [allPages, setAllPages] = useState<FlatPage[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevQueryRef = useRef("");

  useEffect(() => {
    fetch("/api/tree")
      .then((r) => r.json())
      .then((tree) => setAllPages(flattenTree(tree)))
      .catch(() => {});
  }, []);

  const filtered = allPages.filter(
    (p) =>
      query === "" ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.path.toLowerCase().includes(query.toLowerCase())
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
    prevQueryRef.current = "";
  }, []);

  const insertLink = useCallback(
    (page: FlatPage) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 200),
        from
      );
      const match = textBefore.match(/\[\[([^\]]*)$/);
      if (!match) return;

      const deleteFrom = from - match[0].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContentAt(deleteFrom, {
          type: "text",
          text: page.title,
          marks: [{ type: "wikiLink", attrs: { pageName: page.title } }],
        })
        .run();

      handleClose();
    },
    [editor, handleClose]
  );

  // Watch editor transactions for [[ trigger
  useEffect(() => {
    if (!editor) return;

    const checkForTrigger = () => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 200),
        from
      );
      const match = textBefore.match(/\[\[([^\]]*)$/);

      if (match) {
        const newQuery = match[1];
        if (!open) {
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editor.view.dom.getBoundingClientRect();
          setPosition({
            top: coords.bottom - editorRect.top + 4,
            left: coords.left - editorRect.left,
          });
        }
        if (newQuery !== prevQueryRef.current) {
          setSelectedIndex(0);
          prevQueryRef.current = newQuery;
        }
        setOpen(true);
        setQuery(newQuery);
      } else {
        if (open) handleClose();
      }
    };

    editor.on("transaction", checkForTrigger);
    return () => editor.off("transaction", checkForTrigger);
  }, [editor, open, handleClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, Math.min(filtered.length, 8) - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selectedIndex]) insertLink(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, filtered, selectedIndex, insertLink, handleClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open, handleClose]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-[280px] bg-popover border border-border rounded-lg shadow-lg py-1 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.slice(0, 8).map((page, i) => (
        <button
          key={page.path}
          onClick={() => insertLink(page)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
            i === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium truncate">{page.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {page.path}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
