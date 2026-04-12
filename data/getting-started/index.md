---
title: Getting Started
created: '2026-04-12T00:00:00.000Z'
modified: '2026-04-12T00:00:00.000Z'
tags:
  - guide
  - onboarding
  - files
order: 0
---

# Getting Started with Cabinet

Cabinet is an AI-first knowledge base. Everything lives as files on disk — no database, no cloud lock-in. You write pages in markdown, organize them in a tree, and let AI agents help you edit and maintain the whole thing.

## Supported File Types

Cabinet treats specific file formats as first-class views. Everything else can still live in the KB as an asset linked from a markdown page.

| Type | Files | How Cabinet shows it | Sidebar icon |
|------|-------|----------------------|--------------|
| Markdown page | `*.md`, `index.md` | WYSIWYG editor with markdown source toggle | FileText (gray) |
| CSV data | `*.csv` | Interactive table editor with source view | Table (green) |
| PDF document | `*.pdf` | Inline PDF viewer (browser-native) | FileType (red) |
| Mermaid diagram | `*.mermaid`, `*.mmd` | Rendered diagram | GitBranch (violet) |
| Image | `.png .jpg .jpeg .gif .webp .svg .avif .ico` | Inline image viewer | Image (pink) |
| Video | `.mp4 .webm .mov .m4v` | Inline video player | Video (cyan) |
| Audio | `.mp3 .wav .ogg .m4a .aac` | Inline audio player | Music (amber) |
| Source code | `.js .ts .py .go .swift .yaml .json` (and more) | Syntax-highlighted viewer | Code (violet) |
| Embedded website | Directory with `index.html`, no `index.md` | Iframe in main panel, sidebar visible | Globe (blue) |
| Full-screen app | Directory with `index.html` + `.app` marker | Full-screen iframe, sidebar collapses | AppWindow (green) |
| Linked Git repo | Directory with `.repo.yaml` | Normal page/folder, repo context for agents | GitBranch (orange) |
| Linked directory | Symlink without `.repo.yaml` | Normal folder, contents appear as children | Link2 (blue) |
| Office / archive | `.docx .pptx .xlsx .zip .fig .sketch` (and more) | Shown in sidebar, opens in Finder | File (gray) |

## Sidebar Icons at a Glance

| Icon | Color | Meaning |
|------|-------|---------|
| AppWindow | Green | Full-screen embedded app (`.app` marker) |
| Globe | Blue | Embedded website (directory with `index.html`) |
| GitBranch | Orange | Linked Git repo (`.repo.yaml`) |
| Link2 | Blue | Linked directory (non-repo symlink) |
| FileType | Red | PDF file |
| Table | Green | CSV file |
| Code | Violet | Source code file |
| Image | Pink | Image file |
| Video | Cyan | Video file |
| Music | Amber | Audio file |
| Folder | Gray | Regular directory (has `index.md`) |
| FileText | Gray | Markdown page |

## Core Features

- **WYSIWYG Editor** — Rich text editing with toolbar, tables, code blocks, and markdown source toggle
- **AI Editor Panel** — Right-side panel where Claude edits pages directly. Use `@PageName` to attach context
- **Agent Dashboard** — Run AI agents on tasks, monitor sessions, view transcripts
- **Scheduled Jobs** — Cron-based automation with YAML configs under `.jobs/`
- **Heartbeats** — Recurring agent check-ins defined in `persona.md`
- **Kanban Tasks** — Board and list views (Backlog → In Progress → Review → Done)
- **Web Terminal** — Full Claude Code terminal in the browser (xterm.js + node-pty)
- **Search** — `Cmd+K` full-text search across all pages
- **Version History** — Git-backed auto-save with diff viewer and one-click restore
- **Drag & Drop** — Reorder pages in the sidebar, upload images by pasting or dragging
- **Cabinets** — Runtime sub-directories with their own agents, jobs, and visibility scope

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open search |
| `Cmd+S` | Force save |
| `Cmd+`` | Toggle terminal |
| `Cmd+Shift+A` | Toggle AI panel |

## Sub-pages

- [[Apps and Repos]] — Embedded apps, full-screen mode, and linked repos
- [[Symlinks and Load Knowledge]] — Direct symlinks, `.cabinet-meta`, `.repo.yaml`, and `CABINET_DATA_DIR`
