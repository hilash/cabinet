---
title: "Editor Tips"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - editor
order: 1
---

# Editor Tips

Cabinet's editor is a full WYSIWYG rich text editor built on Tiptap. It feels like writing in a modern doc, but everything is stored as plain markdown on disk. No proprietary formats, no lock-in — just `.md` files you can read anywhere.

## Rich Text Formatting

The toolbar at the top gives you quick access to all the essentials:

| Format | Shortcut | What It Does |
|--------|----------|--------------|
| **Bold** | `Cmd+B` | Makes text **bold** — for when you really mean it |
| *Italic* | `Cmd+I` | Adds *emphasis* — for when you sort of mean it |
| Headings | `Cmd+Shift+1-6` | H1 through H6 — organize your thoughts |
| Bullet list | `Cmd+Shift+8` | Unordered lists for brainstorming |
| Numbered list | `Cmd+Shift+7` | Ordered lists for step-by-step instructions |
| Blockquote | `Cmd+Shift+B` | Pull quotes and callouts |
| Code block | `Cmd+Shift+E` | Syntax-highlighted code fences |
| Strikethrough | `Cmd+Shift+X` | ~~For ideas that didn't survive testing~~ |

## Slash Commands

Type `/` at the start of a line (or after a space) to open the command menu. This is the fastest way to insert formatted blocks:

- `/heading` — Insert a heading (H1, H2, H3)
- `/bullet` — Start a bullet list
- `/numbered` — Start a numbered list
- `/quote` — Insert a blockquote
- `/code` — Insert a code block
- `/table` — Insert a table
- `/divider` — Insert a horizontal rule
- `/image` — Insert an image

Just start typing after `/` to filter the options. It's faster than reaching for the toolbar, especially once you get the muscle memory down.

## Markdown Toggle

Click the markdown icon in the toolbar (or use the keyboard shortcut) to switch between rich text and raw markdown. This is useful when you want to:

- Fine-tune formatting that the WYSIWYG doesn't expose
- Copy raw markdown to use elsewhere
- Debug weird formatting issues
- Feel like a proper wizard writing spells by hand

The toggle is lossless — switching back and forth won't eat your content.

## Tables

You can create tables directly in the editor:

1. Use the `/table` slash command to insert one
2. Click cells to edit them
3. Use the table menu (appears when you click inside a table) to add/remove rows and columns

Tables are stored as standard markdown tables, so they work everywhere.

## Images and Files

Cabinet supports several ways to add images:

- **Paste from clipboard** — Screenshot something and `Cmd+V` directly into the editor
- **Drag and drop** — Drag an image file from Finder into the editor
- **Slash command** — Type `/image` to browse for a file

Images are stored alongside the page in its directory. No external hosting, no broken links — everything stays together like a well-organized stockroom.

## Auto-Save

Cabinet saves your work automatically, 500 milliseconds after you stop typing. There's no save button because you don't need one. Every save is also committed to Git, so you have a complete history of every change.

The save indicator in the toolbar shows you the current state:
- **Saved** — All changes are persisted
- **Saving...** — A save is in progress
- **Unsaved changes** — You have edits that haven't been saved yet (rare, usually just means you're still typing)

## Try It

Open [[Operations]] and try editing — add bold text, insert a table, or use `/heading` to add a new section. Everything auto-saves, and you can always undo with `Cmd+Z` or restore from [[Version History]] if things go sideways.

---

Back to [[How to Use Cabinet]]
