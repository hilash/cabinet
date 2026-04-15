"use client";

import { type Editor } from "@tiptap/react";
import { Toggle } from "@multica/ui/components/ui/toggle";
import { Separator } from "@multica/ui/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  FileCode,
  CheckSquare,
  PilcrowRight,
  PilcrowLeft,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const frontmatter = useEditorStore((s) => s.frontmatter);
  const updateFrontmatter = useEditorStore((s) => s.updateFrontmatter);
  const isRtl = frontmatter?.dir === "rtl";

  if (!editor) return null;

  const items = [
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      label: "标题 1",
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      label: "标题 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      label: "标题 3",
    },
    { separator: true },
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: "加粗",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: "斜体",
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive("strike"),
      label: "删除线",
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
      label: "行内代码",
    },
    { separator: true },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      label: "无序列表",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      label: "有序列表",
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
      label: "引用",
    },
    {
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
      label: "任务列表",
    },
    {
      icon: FileCode,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
      label: "代码块",
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      label: "分割线",
    },
    { separator: true },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      label: "撤销",
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      label: "重做",
    },
    { separator: true },
    {
      icon: isRtl ? PilcrowLeft : PilcrowRight,
      action: () => updateFrontmatter({ dir: isRtl ? undefined : "rtl" }),
      isActive: isRtl,
      label: isRtl ? "切换为从左到右" : "切换为从右到左",
    },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-2 py-1 bg-background/50 overflow-x-auto scrollbar-none">
      {items.map((item, i) => {
        if ("separator" in item) {
          return (
            <Separator key={i} orientation="vertical" className="mx-1 h-6" />
          );
        }
        const Icon = item.icon;
        return (
          <Toggle
            key={i}
            size="sm"
            pressed={item.isActive}
            onPressedChange={() => item.action()}
            aria-label={item.label}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        );
      })}
    </div>
  );
}
