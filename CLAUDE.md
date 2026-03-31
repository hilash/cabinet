# CLAUDE.md — Amazingg KB

## What is this project?

Amazingg KB is an AI-first self-hosted knowledge base for the Amazingg.ai startup (GPU optimization). All content lives as markdown files on disk. The web UI provides WYSIWYG editing, a collapsible tree sidebar, drag-and-drop page organization, and an AI panel that can edit pages via Claude CLI.

**Core philosophy:** Humans define intent. Agents do the work. The knowledge base is the shared memory between both.

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **UI:** Tailwind CSS + shadcn/ui (base-ui based, NOT Radix — no `asChild` prop)
- **Editor:** Tiptap (ProseMirror-based) with markdown roundtrip via HTML intermediate
- **State:** Zustand (tree-store, editor-store, ai-panel-store, app-store)
- **Fonts:** Inter (sans) + JetBrains Mono (code)
- **Icons:** Lucide (no emoji in system chrome)
- **Markdown:** gray-matter (frontmatter), unified/remark (MD→HTML), turndown (HTML→MD)
- **AI:** Claude CLI headless mode (`claude -p`) for page editing

## Architecture

```
src/
  app/api/tree/              → GET tree structure from /data
  app/api/pages/[...path]/   → GET/PUT/POST/DELETE/PATCH pages
  app/api/upload/[...path]/  → POST file upload to page directory
  app/api/assets/[...path]/  → GET/PUT static file serving + raw file writes
  app/api/search/            → GET full-text search
  app/api/tasks/             → GET/POST task board CRUD
  app/api/agents/            → GET/POST agent sessions
  app/api/jobs/              → GET/POST scheduled jobs
  app/api/git/               → Git log, diff, commit endpoints
  app/api/ai/edit/           → POST instruction → Claude edits page
  stores/                    → Zustand (tree, editor, ai-panel, task, app)
  components/sidebar/        → Tree navigation, drag-and-drop, context menu
  components/editor/         → Tiptap WYSIWYG + toolbar, website/PDF/CSV viewers
  components/ai-panel/       → Right-side AI chat panel
  components/tasks/          → Kanban board
  components/agents/         → Agent dashboard
  components/jobs/           → Jobs manager UI
  components/terminal/       → xterm.js web terminal
  components/search/         → Cmd+K search dialog
  components/layout/         → App shell, header
  lib/storage/               → Filesystem ops (path-utils, page-io, tree-builder, task-io)
  lib/markdown/              → MD↔HTML conversion
  lib/git/                   → Git service (auto-commit, history, diff)
  lib/agents/                → Agent session manager
  lib/jobs/                  → Job scheduler (node-cron)
server/
  terminal-server.ts         → Standalone WebSocket server for PTY sessions
data/                        → Content directory (KB pages, tasks, jobs)
```

## Key Rules

1. **No database** — everything is files on disk under `/data`
2. **Pages** are directories with `index.md` + assets, or standalone `.md` files. PDFs and CSVs are also first-class content types.
3. **Frontmatter** (YAML) stores metadata: title, created, modified, tags, icon, order
4. **Path traversal prevention** — all resolved paths must start with DATA_DIR
5. **shadcn/ui uses base-ui** (not Radix) — DialogTrigger, ContextMenuTrigger etc. do NOT have `asChild`
6. **Dark mode default** — theme toggle available, use `next-themes` with `attribute="class"`
7. **Auto-save** — debounced 500ms after last keystroke in editor-store
8. **AI edits** — Claude edits files DIRECTLY using its tools (read/edit), NOT by returning full content as stdout. The `/api/ai/edit` endpoint gives Claude the file path and instruction — Claude uses its file editing tools to make targeted changes.
9. **Version restore** — users can restore any page to a previous git commit via the Version History panel
10. **Embedded apps** — dirs with `index.html` + no `index.md` render as iframes. Add `.app` marker for full-screen mode (sidebar + AI panel auto-collapse)
11. **Linked repos** — `.repo.yaml` in a data dir links it to a Git repo (local path + remote URL). Agents use this to read/search source code in context. See `data/CLAUDE.md` for full spec.

## AI Editing Behavior (CRITICAL)

When the AI panel sends an edit request:

1. **Claude gets the file path and instruction** — it should READ the file, then make TARGETED edits
2. **NEVER replace the entire file** — only modify the specific parts the user asked about
3. **PRESERVE existing content** — "add X" means INSERT, not REPLACE
4. **The output shown in the AI panel** is Claude's summary of what it changed, NOT the file content
5. **If content gets corrupted** — users can restore from Version History (clock icon → select commit → Restore)

The AI panel supports `@` mentions — users type `@PageName` to attach other pages as context. The mentioned pages' content is fetched and appended to the prompt so Claude has full context.

## What's been built

### Phase 1 — Core KB
- File-backed storage layer with CRUD API routes
- Collapsible tree sidebar with drag-and-drop page reordering
- Right-click context menu: "Add Sub Page", "Delete"
- Tiptap WYSIWYG editor with formatting toolbar
- Markdown roundtrip: MD → remark → HTML → Tiptap (load) / Tiptap → HTML → turndown → MD (save)
- Auto-save with status indicator (500ms debounce)
- Dark/light theme toggle (Inter + JetBrains Mono fonts)
- Paste/drag-drop media upload with asset serving API
- Full-text search (Cmd+K) across all markdown files
- Export: Copy MD, Copy HTML, Download .md, Download PDF
- Embedded website rendering (index.html dirs → iframe with globe icon)

### Phase 2 — AI & Tasks
- AI Editor panel with @ file mentions for context injection
- Claude edits files DIRECTLY via tools (not stdout replacement)
- Kanban task board (Backlog, In Progress, Review, Done) with Board/List toggle
- My Tasks date view (grouped by Overdue, Today, This Week, Later)
- "Run with Agent" button on task cards
- Agent Dashboard with live stats and session control
- Claude Code web terminal (xterm.js + node-pty via WebSocket)
- Git auto-commit on save (5s debounce via simple-git)
- Version history panel with diff viewer + Restore to previous version
- Scheduled jobs engine (node-cron + YAML configs in `/data/.jobs/`)
- Jobs Manager UI (create, toggle, run now, delete, history)
- Global keyboard shortcuts: Cmd+S, Cmd+K, Cmd+`, Cmd+Shift+A

### Phase 3-4 — Polish & Infrastructure
- Wiki-links [[Page Name]] with input rule and styled rendering
- Slash commands (/ palette with 10 commands)
- Markdown source toggle (WYSIWYG ↔ raw markdown)
- Table support (Tiptap tables + GFM roundtrip)
- Rename page in context menu
- Provider abstraction layer + settings page
- Mobile-responsive layout
- Global status bar with git info
- Headless AI operations endpoint (/api/agents/headless)

### Phase 5 — KB as Startup OS
- Full-screen app embedding (`.app` marker → auto-collapse sidebar/AI panel, iframe fills viewport)
- Linked repositories (`.repo.yaml` → agents discover and read source code in context)
- Wiki-links render in MD→HTML pipeline (not just live input rules)
- Task list checkboxes render with proper Tiptap DOM structure
- Sidebar collapsed state in Zustand store (cross-component control)
- KB reorganized: product/, market/, people/ (CRM), research/, operations/, presentations/
- Inline PDF viewer — PDFs appear in sidebar (red icon), click to view with browser native renderer
- CSV viewer/editor — CSVs appear in sidebar (green table icon), interactive table with cell editing, add/delete rows/columns, source mode toggle, save with auto-commit
- Relative URL resolution in markdown (./file.pdf → /api/assets/path/file.pdf)
- Distinct sidebar icons per content type: AppWindow (green), Globe (blue), GitBranch (orange), FileType (red), Table (green), Folder, FileText
- Assets API supports PUT for raw file writes (CSV save, etc.)

### What's NOT built yet
- Multi-user authentication
- Real-time collaborative editing (Yjs)
- Google Drive export
- Multi-provider implementation (Gemini, Codex, APIs — settings page ready)
- Telegram/Slack/email notifications for jobs

## Commands

```bash
npm run dev          # Start Next.js dev server on localhost:3000
npm run dev:terminal # Start terminal WebSocket server on localhost:3001
npm run dev:all      # Start both servers
npm run build        # Production build
npm run lint         # ESLint
```

## Progress Tracking

After every change you make to this project, append an entry to `PROGRESS.md` using this format:

```
[YYYY-MM-DD] Brief description of what changed in 1-3 sentences.
```

This is mandatory. Do not skip it. The PROGRESS.md file is the changelog for this project.
