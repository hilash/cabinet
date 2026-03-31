---
title: Getting Started
created: '2026-03-21T00:00:00.000Z'
modified: '2026-03-30T11:48:25.673Z'
tags:
  - guide
  - onboarding
order: 1
---
# Welcome to Cabinet

The AI-first knowledge base and startup OS — shared memory between humans and AI agents.

## What's Here

| Section | What It Contains |
|---------|-----------------|
| [[Product]] | Product formulation, roadmap, and archive of earlier drafts |
| [[Market]] | Competitors, market landscape, and target segments |
| [[People]] | CRM — team, advisors, investors, industry contacts, customers |
| [[Research]] | GPU hardware specs, technical deep dives, validation work |
| [[Presentations]] | Pitch decks and presentation materials |
| [[Operations]] | Fundraising, legal, hiring (as needed) |

## Features

- **WYSIWYG Editor** — Rich text editing with formatting toolbar, tables, code blocks, and markdown source toggle
- **Wiki-Links** — Type `[[Page Name]]` to link between pages. Links render as styled clickable elements.
- **Slash Commands** — Type `/` for quick formatting options
- **AI Editor** — Right-side panel where Claude edits pages directly. Use `@PageName` to attach context
- **Kanban Tasks** — Board and list views with Backlog, In Progress, Review, Done columns
- **Agent Dashboard** — Run AI agents on tasks, monitor sessions
- **Web Terminal** — Full Claude Code terminal in the browser (xterm.js + node-pty)
- **Scheduled Jobs** — Cron-based automation with YAML configs
- **Search** — `Cmd+K` full-text search across all pages
- **Version History** — Git-backed auto-save with diff viewer and restore
- **Drag & Drop** — Reorder pages in the sidebar, upload images by pasting/dragging
- **Export** — Copy as MD/HTML, download .md, or print to PDF
- **Dark/Light Mode** — Theme toggle with Inter + JetBrains Mono fonts
- **PDF Viewer** — PDF files appear in the sidebar and open inline with the browser's native PDF renderer
- **CSV Viewer/Editor** — CSV files render as interactive tables. Double-click cells to edit, add/delete rows and columns, toggle source view, and save with auto-commit
- **Embedded Apps** — Directories with `index.html` render as embedded websites. Add a `.app` marker for full-screen mode (sidebar auto-collapses)
- **Linked Repos** — Add `.repo.yaml` to link a KB directory to a Git repo. AI agents use this to read source code in context

## Sidebar Icons

| Icon | Color | Meaning |
|------|-------|---------|
| AppWindow | Green | Full-screen embedded app (`.app` marker) |
| Globe | Blue | Embedded website (`index.html`) |
| GitBranch | Orange | Directory linked to a Git repo (`.repo.yaml`) |
| FileType | Red | PDF file |
| Table | Green | CSV file |
| Folder | Gray | Regular directory |
| FileText | Gray | Markdown page |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+S` | Force save |
| `Cmd+K` | Search |
| `Cmd+`` ` | Toggle terminal |
| `Cmd+Shift+A` | Toggle AI panel |

---

Last Updated: 2026-03-30
