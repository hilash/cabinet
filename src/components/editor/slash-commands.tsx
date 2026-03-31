"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Table,
  ImageIcon,
  CheckSquare,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface SlashCommand {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  action: (editor: Editor) => void;
}

const commands: SlashCommand[] = [
  {
    label: "Heading 1",
    icon: Heading1,
    description: "Large section heading",
    action: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    icon: Heading2,
    description: "Medium section heading",
    action: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    icon: Heading3,
    description: "Small section heading",
    action: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bullet List",
    icon: List,
    description: "Create a bullet list",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered List",
    icon: ListOrdered,
    description: "Create a numbered list",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Code Block",
    icon: Code,
    description: "Insert a code block",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "Blockquote",
    icon: Quote,
    description: "Insert a blockquote",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Divider",
    icon: Minus,
    description: "Insert a horizontal rule",
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "Table",
    icon: Table,
    description: "Insert a table",
    action: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    label: "Image",
    icon: ImageIcon,
    description: "Insert an image from URL",
    action: (editor) => {
      const url = prompt("Image URL:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    label: "Checklist",
    icon: CheckSquare,
    description: "Create a task checklist",
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Callout",
    icon: Info,
    description: "Insert an info callout",
    action: (editor) =>
      editor.chain().focus().wrapIn("callout", { type: "info" }).run(),
  },
  {
    label: "Warning",
    icon: AlertTriangle,
    description: "Insert a warning callout",
    action: (editor) =>
      editor.chain().focus().wrapIn("callout", { type: "warning" }).run(),
  },
];

interface SlashCommandsProps {
  editor: Editor | null;
}

export function SlashCommands({ editor }: SlashCommandsProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleSelect = useCallback(
    (command: SlashCommand) => {
      if (!editor) return;

      // Delete the slash and query text
      const { from } = editor.state.selection;
      const slashStart = from - query.length - 1;
      editor
        .chain()
        .focus()
        .deleteRange({ from: slashStart, to: from })
        .run();

      command.action(editor);
      handleClose();
    },
    [editor, query, handleClose]
  );

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        if (event.key === "/") {
          // Check if we're at the start of a line or after a space
          const { from } = editor.state.selection;
          const textBefore = editor.state.doc.textBetween(
            Math.max(0, from - 1),
            from
          );
          if (from === 1 || textBefore === "" || textBefore === "\n" || textBefore === " ") {
            // Get cursor position for menu placement
            const coords = editor.view.coordsAtPos(from);
            const editorRect = editor.view.dom.getBoundingClientRect();
            setPosition({
              top: coords.bottom - editorRect.top + 4,
              left: coords.left - editorRect.left,
            });
            setOpen(true);
            setQuery("");
            setSelectedIndex(0);
          }
        }
        return;
      }

      // Menu is open
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
      } else if (event.key === "Backspace") {
        if (query.length === 0) {
          handleClose();
        } else {
          setQuery((q) => q.slice(0, -1));
          setSelectedIndex(0);
        }
      } else if (event.key === " ") {
        handleClose();
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        setQuery((q) => q + event.key);
        setSelectedIndex(0);
      }
    };

    // Use capture to intercept before Tiptap
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editor, open, query, selectedIndex, filtered, handleClose, handleSelect]);

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
      className="absolute z-50 w-[240px] bg-popover border border-border rounded-lg shadow-lg py-1 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.label}
            onClick={() => handleSelect(cmd)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
              i === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[12px] font-medium">{cmd.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {cmd.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
