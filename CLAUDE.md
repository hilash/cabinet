# CLAUDE.md — Cabinet

## What is this project?

Cabinet is an AI-first self-hosted knowledge base and startup OS. All content lives as markdown files on disk. The web UI provides WYSIWYG editing, a collapsible tree sidebar, drag-and-drop page organization, and an AI panel that can edit pages via Claude CLI.

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


## Commands

```bash
npm run dev          # Start Next.js dev server on localhost:3000
npm run dev:terminal # Start terminal WebSocket server on localhost:3001
npm run dev:all      # Start both servers
npm run debug:chrome # Launch Chrome with CDP on localhost:9222 for frontend debugging
npm run build        # Production build
npm run lint         # ESLint
```

**Docker Compose** (optional): runs Next.js and the cabinet daemon in containers — `docker compose up --build` (app on :3000, daemon on :3001; optional Caddy on :80).

## Frontend Debugging

Use `npm run debug:chrome` when you need a debuggable browser session. It launches Chrome or Chromium with `--remote-debugging-port=9222`, opens Cabinet at `http://localhost:3000` by default, and prints the DevTools endpoints:

- `http://127.0.0.1:9222/json/version`
- `http://127.0.0.1:9222/json/list`

This makes it possible to attach over CDP and inspect real DOM, network, and screenshots instead of guessing at frontend state.

## Progress Tracking

After every change you make to this project, append an entry to `PROGRESS.md` using this format:

```
[YYYY-MM-DD] Brief description of what changed in 1-3 sentences.
```

This is mandatory. Do not skip it. The PROGRESS.md file is the changelog for this project.
