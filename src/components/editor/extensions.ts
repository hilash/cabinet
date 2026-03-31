import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { WikiLink } from "./wiki-link-extension";
import { CalloutExtension } from "./callout-extension";

const lowlight = createLowlight(common);

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    codeBlock: false, // replaced by CodeBlockLowlight
  }),
  CodeBlockLowlight.configure({
    lowlight,
    HTMLAttributes: {
      class: "rounded-md bg-muted p-4 font-mono text-sm",
    },
  }),
  Placeholder.configure({
    placeholder: "Start writing, or press '/' for commands...",
  }),
  Image.configure({
    HTMLAttributes: {
      class: "rounded-lg max-w-full",
    },
    allowBase64: false,
  }),
  Table.configure({
    resizable: false,
    HTMLAttributes: {
      class: "border-collapse w-full",
    },
  }),
  TableRow,
  TableCell,
  TableHeader,
  TaskList.configure({
    HTMLAttributes: {
      class: "task-list",
    },
  }),
  TaskItem.configure({
    nested: true,
  }),
  WikiLink,
  CalloutExtension,
];
