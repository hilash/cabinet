# CLAUDE.md — Cabinet

## What is this project?

Cabinet is an AI-first self-hosted knowledge base and startup OS. All content lives as markdown files on disk. The web UI provides WYSIWYG editing, a collapsible tree sidebar, drag-and-drop page organization, structured AI runs for tasks/jobs/heartbeats, and interactive `WebTerminal` surfaces for direct CLI sessions.

**Core philosophy:** Humans define intent. Agents do the work. The knowledge base is the shared memory between both.

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **UI:** Tailwind CSS + shadcn/ui (base-ui based, NOT Radix — no `asChild` prop)
- **Editor:** Tiptap (ProseMirror-based) with markdown roundtrip via HTML intermediate
- **State:** Zustand (tree-store, editor-store, ai-panel-store, task-store, app-store)
- **Fonts:** Inter (sans) + JetBrains Mono (code)
- **Icons:** Lucide (no emoji in system chrome)
- **Markdown:** gray-matter (frontmatter), unified/remark (MD→HTML), turndown (HTML→MD)
- **AI providers:** Claude Code, Codex CLI, Cursor CLI, OpenCode, Copilot CLI, Grok CLI, Pi, and a generic CLI adapter — all driven through the shared adapter runtime in `src/lib/agents/`.

## Architecture

```
src/
  app/api/tree/              → GET tree structure from /data
  app/api/pages/[...path]/   → GET/PUT/POST/DELETE/PATCH pages
  app/api/upload/[...path]/  → POST file upload to page directory
  app/api/assets/[...path]/  → GET/PUT static file serving + raw file writes
  app/api/search/            → GET full-text search
  app/api/agents/conversations/ → Manual task/conversation creation + listing
  app/api/agents/providers/  → Provider, model, adapter metadata
  app/api/agents/tasks/      → Task board data
  app/api/agents/scheduler/  → Scheduler control/status
  app/api/agents/skills/     → Skill library: list/CRUD, import (github/skills.sh/local), bundle-into-cabinet, trust, scan, catalog
  app/api/git/               → Git log, diff, commit endpoints
  stores/                    → Zustand (tree, editor, ai-panel, task, app)
  components/sidebar/        → Tree navigation, drag-and-drop, context menu
  components/editor/         → Tiptap WYSIWYG + toolbar, website/PDF/CSV/office viewers
  components/editor/office/  → Read-only viewers for .docx, .xlsx, .pptx
  components/ai-panel/       → Right-side AI chat panel
  components/tasks/          → Task board + task detail panel
  components/agents/         → Agents workspace + live/result conversation views
  components/jobs/           → Jobs manager UI
  components/terminal/       → xterm.js web terminal
  components/composer/       → Shared composer + task runtime picker (supports @page, @agent, @skill mentions)
  components/skills/         → Skill library, detail page, add dialog, picker, "Skills offered" transcript footer
  components/search/         → Cmd+K search dialog
  components/layout/         → App shell, header
  lib/storage/               → Filesystem ops (path-utils, page-io, tree-builder, task-io)
  lib/markdown/              → MD↔HTML conversion
  lib/git/                   → Git service (auto-commit, history, diff)
  lib/agents/                → Adapter runtime, conversation runner, personas, providers
  lib/agents/skills/         → Multi-origin skill loader, trust gating, sync (mount/symlink), discovery scan, lock file
  lib/jobs/                  → Job scheduler (node-cron)
server/
  cabinet-daemon.ts          → Unified daemon: structured adapter runs, PTY sessions, scheduler, event bus
  pty/                       → PTY session module: ansi, claude-lifecycle, manager, types
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
8. **AI runs use a mixed runtime model** — tasks/jobs/heartbeats default to structured adapters; terminal mode (PTY sessions) is a first-class alternative that runs inside the same daemon process via `server/pty/`. `WebTerminal` is the interactive surface for both.
9. **Terminal is a first-class runtime** — not deprecated, not an escape hatch. Terminal mode is user-selectable per task (Native / Terminal toggle in the composer) and is the direction for future terminal-native workflows (Cabinet-managed tmux-like sessions).
10. **Version restore** — users can restore any page to a previous git commit via the Version History panel
11. **Embedded apps** — dirs with `index.html` + no `index.md` render as iframes. Add `.app` marker for full-screen mode (sidebar + AI panel auto-collapse)
12. **Linked repos** — `.repo.yaml` in a data dir links it to a Git repo (local path + remote URL). Agents use this to read/search source code in context. See `data/CLAUDE.md` for full spec.
13. **Office documents** — `.docx`, `.xlsx`/`.xlsm`, `.pptx` render inline via dynamically-imported client viewers (docx-preview, SheetJS, pptx-preview). Read-only; "Download" + "Reveal" actions in the viewer header. Legacy binary formats (`.doc`, `.xls`, `.ppt`) keep the Fallback viewer.
14. **Google Workspace pages** — a markdown page with a `google:` frontmatter key (`url`, optional `kind` / `embedUrl`) is rendered by `GoogleDocViewer` instead of the Tiptap editor. The iframe needs "Anyone with the link" or "Publish to Web" on Google's side. OAuth-based sync is not yet implemented.
15. **Skills** — Anthropic-format skill bundles (`SKILL.md` + frontmatter + optional `references/`/`scripts/`/`assets/`). Resolved across four origins with precedence: cabinet-scoped (`data/<cabinet>/.agents/skills/`) > cabinet-root (`<repo>/.agents/skills/`) > linked-repo > system (`~/.claude/skills/`, `~/.agents/skills/`) > legacy-home (`~/.cabinet/skills/`). Personas reference skills by key in `skills:` (persistent attachment) and `recommendedSkills:` (template defaults shown as preselected toggles in the new-agent flow). Trust gating evaluates each skill at mount time using auto-detected trust level × verified-publisher × author `trust-policy:` frontmatter; operator decisions persist in `.cabinet/skills-trust.json`. Compose `@skill-name` to attach a skill run-only without persisting to the persona. Plan: `docs/SKILLS_PLAN.md`.

## AI Editing Behavior (CRITICAL)

When Cabinet starts an AI edit or task run:

1. **The request becomes a conversation** with `providerId`, `adapterType`, and optional adapter config such as model or effort.
2. **Detached runs** go through `/api/agents/conversations` → `conversation-runner` → `cabinet-daemon`.
3. **Structured adapters are the default** for detached Claude/Codex runs; terminal mode (PTY, named `*_legacy` in the adapter registry for historical reasons) is a first-class alternative surfaced by the composer's Native / Terminal toggle.
4. **Terminal-mode tasks render with `WebTerminal`** — xterm.js bound to the daemon's PTY WebSocket — instead of the structured TurnBlock transcript.
5. **Models should edit targeted files directly when useful** and reflect durable value in KB files, not only transcript text.
6. **If content gets corrupted** — users can restore from Version History (clock icon → select commit → Restore)

The AI panel supports `@` mentions — users type `@PageName` to attach pages as context, `@AgentName` to dispatch to another agent, or `@skill-name` to attach a skill for this run only (does NOT persist to the persona's `skills:` list). Mentioned pages' content is fetched and appended to the prompt; mentioned skills are merged with the persona's skills and trust-gated before mounting via `prepareSkillMount`.


## Commands

```bash
npm run dev          # Start Next.js dev server (default: localhost:4000, auto-bumps if busy)
npm run dev:daemon   # Start unified daemon (default: localhost:4100, auto-bumps if busy)
                     #   PTY sessions + structured adapters + scheduler + event bus, under tsx watch
npm run dev:all      # Start both servers
npm run debug:chrome # Launch Chrome with CDP on localhost:9222 for frontend debugging
npm run build        # Production build
npm run lint         # ESLint
npm run skills:sync  # Verify skills-lock.json against on-disk skill bundles (drift report)
```

## Frontend Debugging

Use `npm run debug:chrome` when you need a debuggable browser session. It launches Chrome or Chromium with `--remote-debugging-port=9222`, opens Cabinet at `http://localhost:4000` by default (override by passing a URL as the first argument), and prints the DevTools endpoints:

- `http://127.0.0.1:9222/json/version`
- `http://127.0.0.1:9222/json/list`

This makes it possible to attach over CDP and inspect real DOM, network, and screenshots instead of guessing at frontend state.

## Progress Tracking

After every change you make to this project, append an entry to `PROGRESS.md` using this format:

```
[YYYY-MM-DD] Brief description of what changed in 1-3 sentences.
```

This is mandatory. Do not skip it. The PROGRESS.md file is the changelog for this project.
