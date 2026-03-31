# PRD: Amazingg KB — Startup Knowledge Base & Admin Panel

## 1. Vision

An **AI-first** self-hosted knowledge base and operations hub for a startup team. All content lives as markdown files on disk in a git-backed hierarchy. AI agents (Claude Code) are first-class citizens — they can be launched from the web UI, review and update tasks, generate and edit content, build websites, and automatically link work to relevant artifacts in the knowledge base. Beautiful WYSIWYG editing, embedded websites, task management, and deep AI integration — all in one place.

**Core philosophy:** Humans define intent. Agents do the work. The knowledge base is the shared memory between both.

## 2. Users

- **Phase 1:** 2 founders (no auth required — single-user local access)
- **Phase 2:** Multi-user with authentication (deferred)

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 14+ (App Router)** | Full-stack, SSR, API routes, great DX |
| Runtime | **Node.js** | Native filesystem access, simple deployment |
| Editor | **Tiptap** (ProseMirror-based) | WYSIWYG, extensible, markdown serialization, paste-to-upload |
| Markdown | **unified/remark** | Parse/serialize MD, AST manipulation |
| File Tree UI | **Custom collapsible tree** | Full control over drag-drop, context menus |
| Search | **MiniSearch** (in-memory) or **FlexSearch** | Full-text search, zero external deps |
| Task Board | **@hello-pangea/dnd** (or similar) | Drag-and-drop kanban |
| Version Control | **simple-git** | Git operations from Node.js |
| PDF Export | **puppeteer** or **@react-pdf/renderer** | Server-side PDF generation |
| Real-time (future) | **Yjs + WebSocket** | CRDT-based collaborative editing |
| AI Runtime | **Provider-agnostic agent layer** | Pluggable: CLI-based (Claude Code, Gemini CLI, Codex) or API-based (Anthropic, OpenAI, Google) |
| Terminal Mux | **node-pty + xterm.js** | Each agent/session is a real PTY; web UI connects via WebSocket |
| Agent Queue | **In-memory session manager** | Track active PTY sessions and API agent processes |
| Deployment | Local → VPS (Docker) | Portable, single-command deploy |

## 4. Core Features

### 4.1 File-Backed Knowledge Base

**Storage Structure:**
```
/data                          ← root content directory (git repo)
  /.git
  /getting-started
    index.md
    screenshot.png
  /engineering
    /architecture
      index.md
      diagram.svg
    /api-docs
      index.md
  /websites
    /landing-page-v2
      index.html              ← detected as embedded website
      style.css
      script.js
  /tasks
    backlog.md                ← kanban board data
    2026-03-21.md             ← daily task page
  /.jobs                          ← scheduled jobs (hidden dir)
    competitor-watch.yaml
    .history/
```

**Rules:**
- Each "page" is a directory containing an `index.md` and its assets (images, files, videos)
- Leaf pages can be a single `.md` file (no directory needed if no assets)
- Metadata stored as YAML frontmatter in each markdown file:
  ```yaml
  ---
  title: Architecture Overview
  created: 2026-03-21T10:00:00Z
  modified: 2026-03-21T14:30:00Z
  tags: [engineering, architecture]
  icon: 🏗️
  order: 1
  dir: rtl          # optional: text direction (rtl for Hebrew/Arabic)
  ---
  ```
- Directory ordering via `order` field in frontmatter (fallback: alphabetical)

### 4.2 Collapsible Tree Navigation

- Left sidebar with a hierarchical, collapsible file tree
- **Operations:** Add page, add folder, rename, delete, drag-to-reorder, drag-to-move
- Right-click context menu for all operations
- Icons/emoji per page (from frontmatter)
- Directories containing `index.html` (no `index.md`) show a globe/web icon and render as embedded website
- **Leaf vs. parent icons:** Nodes with children show folder icon + expand chevron. Leaf nodes (no children) show a page icon (FileText) with no chevron — even if they are directories on disk. Only nodes with actual sub-pages are expandable.
- Tree state (expanded/collapsed) persisted in localStorage
- **Keyboard shortcuts:** Arrow keys to navigate, Enter to open, N for new page

### 4.3 WYSIWYG Markdown Editor

Built on **Tiptap** with custom extensions:

- **Rich editing:** Headings, bold, italic, code blocks, tables, checklists, blockquotes, callouts
- **Slash commands:** Type `/` for a command palette (heading, image, table, code block, divider, etc.)
- **Paste-to-upload:** Paste or drag images/files/videos → automatically saved to the page's directory on disk → inserted as relative link in markdown
  - Images: `![alt](./image-name.png)`
  - Files: `[filename](./document.pdf)`
  - Videos: Custom video block with `<video>` tag
- **Code blocks:** Syntax-highlighted with language selector
- **Internal links:** `[[Page Name]]` wiki-link syntax, resolved to actual paths
- **Markdown source toggle:** Button to view/edit raw markdown
- **Auto-save:** Debounced save (500ms after last keystroke), save indicator in toolbar
- **RTL & Hebrew support:**
  - Per-page text direction via frontmatter: `dir: rtl` (default: `ltr`)
  - Toggle button in editor toolbar (pilcrow icon) to switch direction per page — persists to frontmatter and auto-saves
  - Editor respects `dir` attribute on the content area — cursor, alignment, lists all flip correctly
  - Source mode textarea also respects RTL direction
  - Future: auto-detect direction from content, per-block direction toggling (mixed LTR/RTL), Unicode search optimization

### 4.4 Media Handling

- All media stored as files alongside the markdown (NEVER base64 embedded)
- Upload via: paste, drag-and-drop, or explicit upload button
- Supported: images (png, jpg, gif, webp, svg), videos (mp4, webm), files (pdf, zip, etc.)
- File naming: original name preserved, conflicts auto-suffixed (`image.png`, `image-1.png`)
- Relative paths in markdown so files are portable

### 4.5 Embedded Websites

- If a directory contains an `index.html` but no `index.md`, it's treated as an **embedded website**
- Rendered in an iframe with full viewport within the content area
- Tree sidebar collapses automatically when viewing an embedded website (maximizes viewport)
- Toggle button to re-expand the sidebar
- A toolbar above the iframe shows: page title, "Open in new tab", "Back to KB"
- Use case: landing pages, dashboards, data visualizations, prototypes

### 4.6 AI-First Architecture

This is the central differentiator. AI agents are not a bolt-on feature — they are a core part of the system that can read, write, and reason about the entire knowledge base.

#### 4.6.1 Provider-Agnostic Agent Layer

The system is designed to support **multiple AI agent providers** through a unified interface. Each provider is a plugin that implements a common contract:

```typescript
interface AgentProvider {
  id: string;                    // e.g. "claude-code", "gemini-cli", "codex", "anthropic-api"
  name: string;                  // Display name
  type: "cli" | "api";          // CLI-based (PTY) or API-based
  icon: string;                  // Provider logo/icon

  // CLI providers
  command?: string;              // e.g. "claude", "gemini", "codex"
  buildArgs?(prompt: string, workdir: string): string[];

  // API providers
  apiKeyEnvVar?: string;         // e.g. "ANTHROPIC_API_KEY"
  runPrompt?(prompt: string, context: string): Promise<string>;

  // Common
  isAvailable(): Promise<boolean>;  // Check if CLI is installed / API key is set
  healthCheck(): Promise<ProviderStatus>;
}
```

**Supported providers (architecture supports all, Phase 1 implements first):**

| Provider | Type | Auth | Phase |
|----------|------|------|-------|
| **Claude Code Max** | CLI (PTY) | `claude login` (Max subscription) | **Phase 1 (now)** |
| **Gemini CLI** | CLI (PTY) | `gemini auth` | Phase 3 |
| **OpenAI Codex** | CLI (PTY) | `codex auth` | Phase 3 |
| **Anthropic API** | API | `ANTHROPIC_API_KEY` env var | Phase 3 |
| **OpenAI API** | API | `OPENAI_API_KEY` env var | Phase 3 |
| **Google AI API** | API | `GOOGLE_AI_API_KEY` env var | Phase 3 |

**Provider settings UI (Phase 3):**
```
┌─────────────────────────────────────────┐
│  ⚙️ Agent Providers                     │
├─────────────────────────────────────────┤
│                                         │
│  CLI Agents                             │
│  ┌─────────────────────────────────┐    │
│  │ ✅ Claude Code   [Max] Ready    │    │
│  │ ⬚  Gemini CLI    Not installed  │    │
│  │ ⬚  Codex CLI     Not installed  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  API Agents                             │
│  ┌─────────────────────────────────┐    │
│  │ ⬚  Anthropic API  [Set Key]    │    │
│  │ ⬚  OpenAI API     [Set Key]    │    │
│  │ ⬚  Google AI API  [Set Key]    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Default agent: [Claude Code Max ▼]     │
└─────────────────────────────────────────┘
```

#### 4.6.2 Web Terminal (Phase 1: Claude Code Max)

**Phase 1 implementation** uses Claude Code Max exclusively. The provider abstraction is in the code but only one provider is wired up.

**How it works:**
```
Browser (xterm.js) ←WebSocket→ Server (node-pty) → spawns `claude` CLI process
```

- Server spawns a real `claude` CLI process via `node-pty` per session
- The user's local Claude Code Max authentication is inherited (the CLI is already logged in)
- For **CLI providers**: xterm.js renders the full terminal UI (colors, interactive prompts, tool outputs)
- For **API providers** (future): a styled output panel shows the conversation stream instead of raw terminal
- WebSocket bridges browser ↔ PTY for real-time bidirectional I/O
- Working directory set to `/data` (KB root) — agent has full access to all content
- Panel can be toggled, resized, minimized, popped out to full screen
- **Multiple sessions:** Run multiple agent instances in tabs (different providers in different tabs in the future)
- **Session history:** Terminal output logged and browsable, tagged by provider
- **On VPS deployment:** Each CLI provider must be authenticated on the server (e.g., `claude login`)

#### 4.6.2a Claude Code Integration Architecture

This section documents how Claude Code is integrated across the platform — two execution modes, which components use which, and how to modify them.

**Two Execution Modes:**

| Mode | How | When to Use | Output |
|------|-----|-------------|--------|
| **PTY (interactive)** | `node-pty` spawns `claude --dangerously-skip-permissions` via WebSocket → xterm.js | User-facing: terminal panel, AI Editor panel, agent tasks | Full rich TUI: tool calls, diffs, streaming, interactive prompt |
| **Headless (pipe)** | `child_process.spawn("claude", ["-p", prompt, "--output-format", "text"])` | Background/automated: scheduled jobs, smart search, agent manager | Captured stdout text only |

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Terminal Tabs │  │  AI Editor Panel  │  │  Agent Session View   │ │
│  │ (bottom dock) │  │  (right sidebar)  │  │  (agent dashboard)    │ │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬────────────┘ │
│         │                   │                        │              │
│         └──── xterm.js ─────┴── WebTerminal ─────────┘              │
│                      │                                              │
│              WebSocket connection                                    │
│                      │                                              │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
         ws://localhost:3001?id=xxx&prompt=yyy
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│  Terminal Server     │                    (server/terminal-server.ts)│
│                      ▼                                              │
│           ┌─────────────────┐                                       │
│           │   WebSocketServer│  ← resolves claude binary at startup │
│           └────────┬────────┘                                       │
│                    │                                                │
│           ┌────────▼────────┐                                       │
│           │  node-pty.spawn  │  ← per-session PTY                   │
│           │  claude --dangerously-skip-permissions [prompt]          │
│           └────────┬────────┘                                       │
│                    │                                                │
│           PTY stdout/stderr ──→ ws.send() ──→ xterm.js renders     │
│           ws.onmessage()    ──→ pty.write() ──→ user input to CLI  │
└─────────────────────────────────────────────────────────────────────┘
```

**Component → Mode Mapping:**

| Component | File | Mode | Details |
|-----------|------|------|---------|
| **Terminal Tabs** (bottom panel) | `src/components/terminal/terminal-tabs.tsx` | PTY | Interactive Claude Code session. Spawns on toggle (Cmd+\`). Multiple tabs. |
| **AI Editor Panel** (right sidebar) | `src/components/ai-panel/ai-panel.tsx` | PTY | Each edit request spawns an inline PTY terminal. Shows tool calls, diffs, streaming. Auto-reloads page on session close. |
| **Agent Task Runner** | `src/stores/app-store.ts` → `openAgentTab()` | PTY | Opens a terminal tab with a constructed prompt for the task. |
| **Scheduled Jobs** | `src/lib/jobs/job-manager.ts` | Headless | Cron-triggered. Spawns `claude -p` with `--output-format text`. Output captured to log files. |
| **Agent Manager** | `src/lib/agents/agent-manager.ts` | Headless | Background agent execution. Stdout captured, returned as string. |
| **Smart Search** | `src/components/search/search-dialog.tsx` → `/api/agents/headless` | Headless | "Ask AI" fallback when text search returns no results. |
| **Agent Session View** | `src/components/agents/agent-session-view.tsx` → `/api/agents/headless` | Headless | Send prompts to agent personas. |

**Key Files:**

| File | Purpose |
|------|---------|
| `server/terminal-server.ts` | Standalone WebSocket server (port 3001). Resolves claude binary path, spawns PTY sessions, bridges I/O. |
| `src/components/terminal/web-terminal.tsx` | React component wrapping xterm.js. Connects to terminal server via WebSocket. Used by both Terminal Tabs and AI Editor. |
| `src/components/terminal/terminal-tabs.tsx` | Tab bar UI for managing multiple terminal sessions. Resizable via drag handle. |
| `src/components/ai-panel/ai-panel.tsx` | AI Editor right sidebar. Embeds `WebTerminal` per edit request. Supports `@` page mentions for context injection. |
| `src/app/api/ai/edit/route.ts` | Legacy headless edit endpoint (kept for API compatibility but no longer used by AI panel). |
| `src/app/api/agents/headless/route.ts` | One-shot headless endpoint for background AI operations. |

**How to Modify:**

- **Change terminal appearance**: Edit `web-terminal.tsx` — xterm.js theme, font, scrollback, addons.
- **Change terminal server port**: Edit `server/terminal-server.ts` (`PORT` constant) and `web-terminal.tsx` (WebSocket URL).
- **Change claude binary flags**: Edit `terminal-server.ts` — the `args` array in the `if (prompt)` / `else` blocks.
- **Add new AI-powered feature (user-facing)**: Use `WebTerminal` component with a `prompt` prop. It handles PTY connection automatically.
- **Add new AI-powered feature (background)**: Use the headless pattern from `agent-manager.ts` — spawn `claude -p` via `child_process`.
- **Switch to API provider**: Replace `claude -p` in headless callers with HTTP calls to the Anthropic/OpenAI API. The PTY mode stays CLI-only.
- **Fix spawn-helper permissions**: Run `npm run postinstall` or `chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper`.

**node-pty Gotcha (macOS):**

The `node-pty` package ships a `spawn-helper` binary in `prebuilds/darwin-arm64/`. After `npm install`, this binary may lack execute permissions or have macOS quarantine attributes (`com.apple.provenance`), causing `posix_spawnp` to fail. The `postinstall` script in `package.json` auto-fixes this. If the terminal server crashes with `posix_spawnp failed`, run:
```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
xattr -d com.apple.provenance node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

#### 4.6.2b Multi-Theme System

The platform supports 11 custom themes beyond the default dark/light mode, accessible via long-press (or right-click) on the theme button in the header. Short click toggles dark/light.

**Themes (6 dark, 5 light):**

| Name | Type | Font | Accent | Vibe |
|------|------|------|--------|------|
| Claude | Dark | Space Grotesk | Warm brown | Anthropic signature, warm and focused |
| Midnight Ocean | Dark | DM Sans | Deep blue | Calm deep-sea coding |
| Aurora | Dark | Outfit | Purple | Northern lights, creative |
| Ember | Dark | Sora | Orange | Warm firelight, cozy |
| Forest | Dark | Plus Jakarta Sans | Green | Natural, grounded |
| Cyber | Dark | Space Mono | Cyan | Terminal hacker, monospace |
| Paper | Light | Merriweather Sans | Sepia | Old book, literary |
| Sakura | Light | Nunito | Pink | Cherry blossom, soft |
| Meadow | Light | Rubik | Green | Fresh spring, natural |
| Sky | Light | Figtree | Blue | Clear day, professional |
| Lavender | Light | Quicksand | Purple | Gentle, whimsical |

**Key Files:**

| File | Purpose |
|------|---------|
| `src/lib/themes.ts` | Theme definitions (OKLCh CSS vars), `applyTheme()`, localStorage persistence |
| `src/components/layout/theme-picker.tsx` | Long-press menu component with colored accent dots |
| `src/components/layout/header.tsx` | Integrates ThemePicker in header actions |
| `src/app/globals.css` | `[data-custom-theme]` font override rule |
| `src/app/layout.tsx` | Google Fonts `<link>` for all theme fonts |

**How to add a new theme:** Add a `ThemeDefinition` object to the `THEMES` array in `src/lib/themes.ts`. Each theme needs: `name`, `label`, `type` (dark/light), optional `font` (Google Font family), `accent` (hex for preview dot), and `vars` (map of CSS custom properties to OKLCh values).

#### 4.6.3 Agent Task Runner

Tasks from the kanban board can be **assigned to an AI agent** instead of (or in addition to) a human:

```
┌─────────────────────────────────────┐
│  Task: Build landing page for X     │
│  Assignee: 🤖 Claude Code Max       │
│  Status: ● Running (2m 34s)         │
│  Working in: /websites/landing-x/   │
│                                     │
│  [View Live Terminal] [Stop] [Logs] │
│                                     │
│  Linked artifacts:                  │
│   📄 /marketing/brand-guidelines    │
│   📄 /engineering/api-docs          │
└─────────────────────────────────────┘
```

**Flow:**
1. User creates a task on the kanban board
2. User clicks "Run with Agent" → picks a provider (defaults to Claude Code Max; future: Gemini, Codex, API agents)
3. System spawns a session via the selected provider with a constructed prompt that includes:
   - The task title and description
   - Relevant context from linked KB pages (auto-suggested or manually linked)
   - The target working directory
   - Any constraints or templates
4. Agent runs autonomously — user can watch live or check back later
5. When done, agent updates the task status and adds a summary comment
6. Agent auto-links any KB pages it created or referenced

**Agent prompt template:**
```
You are working in the knowledge base at {kb_root}.
Task: {task.title}
Description: {task.description}
Working directory: {task.workdir}
Context from KB:
{linked_pages_content}

Complete this task. When done, create a summary of what you did.
```

#### 4.6.4 AI-Powered Task Review & Enrichment

One-shot AI operations use the **default provider** in headless mode. For CLI providers this means non-interactive mode (e.g., `claude -p "prompt"`). For API providers (future), it's a direct API call.

| Operation | Trigger | Phase 1 (Claude Code Max) | Future (API providers) |
|-----------|---------|--------------------------|----------------------|
| **Auto-link** | Task created/updated | `claude -p "Find related KB pages..."` | API call with page index |
| **Task review** | On demand | `claude -p "Review this task..."` | API call |
| **Summarize changes** | After agent completes | `claude -p "Summarize this diff..."` | API call with diff payload |
| **Update KB** | After agent completes | `claude -p "What pages to update?"` | API call |
| **Daily digest** | Scheduled (cron/manual) | `claude -p "Summarize yesterday..."` | API call |
| **Smart search** | When basic search fails | `claude -p "Find content about..."` | API call with embeddings |

Headless calls are fast — no interactive terminal needed. Output captured directly by the server. The provider abstraction means switching from CLI to API for these operations is a config change, not a code change.

#### 4.6.5 Agent Dashboard

A dedicated page showing all agent activity:

```
┌──────────────────────────────────────────────────────────────┐
│  🤖 Agent Dashboard                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Active Sessions (2)                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ 🟢 Building LP v2    │  │ 🟢 Reviewing API docs│         │
│  │ Running 4m 12s       │  │ Running 1m 03s       │         │
│  │ [Watch] [Stop]       │  │ [Watch] [Stop]       │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                              │
│  Recent Completions                                          │
│  ✅ "Fix auth middleware" — 23 min ago (12 files changed)    │
│  ✅ "Write onboarding guide" — 1h ago (3 pages created)     │
│  ❌ "Deploy to staging" — 2h ago (failed: no SSH key)       │
│                                                              │
│  Agent Stats (this week)                                     │
│  Tasks completed: 14  │  Avg time: 8m  │  Pages created: 7  │
│  Lines of code: 2,340 │  Success rate: 87%                   │
└──────────────────────────────────────────────────────────────┘
```

#### 4.6.5 Knowledge-Aware Agents

Because the KB is just files on disk, Claude Code can natively:

- **Read any KB page** for context before starting work
- **Create new KB pages** as documentation for what it built
- **Update existing pages** (e.g., add API endpoint docs after building an API)
- **Cross-reference** by adding `[[wiki-links]]` between related pages
- **Follow conventions** by reading a `/templates/` directory for page templates

The system provides a `CLAUDE.md` file at the KB root that teaches agents about the KB structure:
```markdown
# KB Structure
- Pages are markdown files in /data/
- Each directory is a section; index.md is the main page
- Assets go next to their markdown file
- Use [[Page Name]] for internal links
- Tasks are in /data/tasks/board.yaml
- When you create new content, add frontmatter with title, tags, created date
```

### 4.7 Task Management

**Kanban Board:**
- Simple board with customizable columns (default: Backlog, In Progress, Done, Agent Review)
- Cards with: title, description (markdown), assignee (human or 🤖 agent), due date, tags, linked KB pages
- Drag-and-drop between columns
- **"Run with Agent" button** on any task card — spawns Claude Code to execute the task
- **Agent status indicator** on cards (idle, running, completed, failed)
- **Auto-linked artifacts:** After an agent completes a task, related KB pages are auto-linked to the card
- Data stored as structured markdown/YAML in a dedicated `/tasks/` directory

**My Tasks (Date View):**
- Page showing tasks grouped by date (today, this week, overdue)
- Filterable by assignee, tag, status
- Quick-add task from this view

**Storage format** (in `/tasks/board.yaml` or frontmatter-based):
```yaml
columns:
  - name: Backlog
    tasks:
      - id: task-001
        title: Set up CI/CD
        assignee: founder-1
        due: 2026-03-25
        tags: [devops]
        description: |
          Configure GitHub Actions for auto-deploy to VPS
  - name: In Progress
    tasks: [...]
```

### 4.8 Scheduled Agent Jobs (Cron)

Recurring AI-powered automation. Define jobs that run on a schedule using any configured agent provider. Each job is a prompt + schedule + delivery config.

#### Job Definition

```yaml
# /data/.jobs/competitor-watch.yaml
id: competitor-watch
name: Daily Competitor Analysis
enabled: true
schedule: "0 8 * * *"                    # Every day at 8 AM
provider: claude-code                     # Which agent provider to use
workdir: /data/research/competitors       # Working directory for the agent
timeout: 600                              # Max seconds (10 min)
retry: { attempts: 2, delay: 60 }        # Retry on failure

prompt: |
  Check these competitor websites for changes since yesterday:
  - https://competitor-a.com
  - https://competitor-b.com/pricing
  - https://competitor-c.com/blog

  Compare with the last report in /data/research/competitors/latest.md
  Create a new report at /data/research/competitors/2026-03-21.md
  Update latest.md with today's findings.
  Summarize key changes in 3-5 bullet points.

on_complete:
  - action: notify
    channel: telegram
    message: "Competitor report ready: {{summary}}"
  - action: update_page
    path: /data/research/competitors/latest.md
  - action: git_commit
    message: "Daily competitor report {{date}}"

on_failure:
  - action: notify
    channel: telegram
    message: "⚠️ Competitor watch failed: {{error}}"
```

#### Jobs Manager UI

```
┌──────────────────────────────────────────────────────────────────┐
│  ⏰ Scheduled Jobs                              [+ New Job]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ✅ Daily Competitor Analysis                               │  │
│  │ 🕐 Every day at 8:00 AM  │  🤖 Claude Code Max           │  │
│  │ Last run: Today 8:01 AM (✅ 4m 22s)  │  Next: Tomorrow    │  │
│  │ [View Report] [Run Now] [Edit] [Logs] [Disable]           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ✅ Weekly KPI Dashboard Update                             │  │
│  │ 🕐 Every Monday at 9:00 AM  │  🤖 Claude Code Max        │  │
│  │ Last run: Mon Mar 16 9:00 AM (✅ 8m 11s)  │  Next: Mon    │  │
│  │ [View Report] [Run Now] [Edit] [Logs] [Disable]           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ⬚ Nightly Backup & Cleanup                [DISABLED]      │  │
│  │ 🕐 Every day at 2:00 AM  │  🤖 Claude Code Max           │  │
│  │ Last run: Never                                            │  │
│  │ [Run Now] [Edit] [Enable]                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Run History                                                     │
│  ┌──────────┬──────────────────────┬────────┬────────┬───────┐  │
│  │ Time     │ Job                  │ Status │ Dur.   │ Logs  │  │
│  ├──────────┼──────────────────────┼────────┼────────┼───────┤  │
│  │ 08:01 AM │ Competitor Analysis  │ ✅     │ 4m 22s │ [→]   │  │
│  │ 02:00 AM │ DB Snapshot          │ ✅     │ 1m 03s │ [→]   │  │
│  │ Yest 8AM │ Competitor Analysis  │ ❌     │ 10m    │ [→]   │  │
│  └──────────┴──────────────────────┴────────┴────────┴───────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### Job Features

- **Visual cron builder** — pick frequency (hourly/daily/weekly/monthly) + time, or write raw cron expression
- **Prompt editor** — full markdown editor for the agent prompt, with access to template variables (`{{date}}`, `{{last_run}}`, `{{job.workdir}}`)
- **Run Now** — manually trigger any job immediately, watch output live in terminal
- **Run history** — every execution logged with: start time, duration, status, full terminal output, files changed, git diff
- **Notifications (on_complete / on_failure):**

| Channel | Config | Phase |
|---------|--------|-------|
| **Telegram** | Bot token + chat ID | **Phase 2** |
| **Slack** | Webhook URL | Phase 3 |
| **Email** | SMTP config | Phase 3 |
| **Webhook** | Custom URL + payload template | Phase 3 |
| **In-app** | Notification bell in the KB UI | **Phase 2** |

- **Post-actions:** After a job completes, automatically:
  - Commit changes to git
  - Update a specific KB page
  - Create a new KB page from a template
  - Move a kanban task to "Done"
  - Chain another job (pipelines)

#### Storage

Jobs are stored as YAML files in `/data/.jobs/`. Run history is stored in `/data/.jobs/.history/`:

```
/data/.jobs/
  competitor-watch.yaml
  weekly-kpi.yaml
  nightly-backup.yaml
  .history/
    2026-03-21T08-01-00_competitor-watch.log    ← terminal output
    2026-03-21T08-01-00_competitor-watch.meta    ← status, duration, files changed
```

#### Scheduler Implementation

- **Phase 1:** Not implemented (focus on KB + terminal)
- **Phase 2:** `node-cron` in the Next.js server process — simple, no external deps
  - Jobs loaded from `/data/.jobs/*.yaml` on startup
  - File watcher reloads jobs when YAML files change
  - Each job execution spawns a headless `claude -p` via the agent provider layer
  - Output captured to history files
- **Future (VPS):** Can optionally use system cron or a process manager (PM2) for resilience across server restarts

#### Example Jobs

| Job | Schedule | What it does |
|-----|----------|-------------|
| Competitor watch | Daily 8 AM | Scrape competitor sites, diff against yesterday, report to Telegram |
| Daily standup prep | Daily 8:30 AM | Summarize yesterday's git activity + open tasks, post to Telegram |
| Weekly KPI report | Monday 9 AM | Pull metrics, update dashboard page, generate PDF |
| Content audit | Weekly Friday | Check for broken links, outdated pages, missing tags |
| Dependency check | Weekly | Scan project repos for outdated deps, create tasks for updates |
| Meeting notes digest | After meetings | Summarize uploaded meeting notes, extract action items to kanban |
| Social media monitor | Every 6 hours | Check brand mentions, summarize sentiment, alert on spikes |

### 4.9 Search

- Full-text search across all markdown files
- Indexed on startup, incrementally updated on file changes (via `fs.watch`)
- Results show: page title, matched snippet with highlighting, path in tree
- Keyboard shortcut: `Cmd+K` to open search
- Filter by: tags, date range, content type

### 4.10 Export & Sharing

| Action | Description |
|--------|-------------|
| **Copy Markdown** | Copy raw MD to clipboard |
| **Download Markdown** | Download the `.md` file |
| **Download PDF** | Server-side render MD → PDF, download |
| **Export to Google Drive** | OAuth2 flow → upload MD or PDF to Drive (Phase 2) |
| **Copy as HTML** | Copy rendered HTML to clipboard (for pasting into emails etc.) |

### 4.11 Git Integration

- `/data` directory initialized as a git repo
- Auto-commit on save (debounced, batched — not every keystroke)
- Commit message format: `Update <page-path>` or `Add <page-path>`
- **Version history panel:** View past versions of any page, diff view, restore
- Manual commit/push button in the UI for syncing to remote
- `.gitignore` for temp files, large binaries (configurable threshold)
- **Auto-sync from GitHub:** On page load, the app automatically runs `git pull` on the data directory to fetch latest changes from remote. If new files are pulled, the sidebar tree refreshes automatically.
- **Sync button:** Status bar includes a "Sync" button (bottom-right) that manually triggers `git pull` + tree refresh. Shows real-time feedback: "Pulling...", "Updated from remote", "Up to date", or error state.
- **`/api/git/pull` endpoint:** POST route that executes `git pull` on the data repo, checks for remote existence, and returns whether files changed.

## 5. UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Search (Cmd+K)                          [User] [⚙️]     │
├────────────┬─────────────────────────────────────────────────┤
│            │  📄 Page Title              [📋 Copy] [⬇ Export]│
│  📁 Tree   │─────────────────────────────────────────────────│
│            │                                                 │
│  > Home    │  WYSIWYG Editor / Website iframe / Kanban      │
│  > Eng     │                                                 │
│    > Arch  │  Content area takes remaining space              │
│    > API   │                                                 │
│  > Tasks   │                                                 │
│  > Jobs ⏰ │                                                 │
│  > Sites   │                                                 │
│    > LP    │                                                 │
│            │─────────────────────────────────────────────────│
│            │  [Terminal: Claude Code]  (toggleable panel)     │
│            │  $ claude "build a landing page"                 │
│  [+ New]   │  > Creating files...                            │
├────────────┴─────────────────────────────────────────────────┤
│  Status: Auto-saved ✓  │  Git: 3 uncommitted  │  Search idx │
└──────────────────────────────────────────────────────────────┘
```

## 6. API Routes (Next.js App Router)

```
GET    /api/tree                    → file tree structure
GET    /api/pages/:path             → read page content + metadata
PUT    /api/pages/:path             → update page content
POST   /api/pages/:path             → create new page/folder
DELETE /api/pages/:path             → delete page/folder
PATCH  /api/pages/:path/move        → move/reorder page
POST   /api/pages/:path/upload      → upload media to page directory

GET    /api/search?q=               → full-text search
GET    /api/tasks                   → get all tasks
PUT    /api/tasks                   → update task board

GET    /api/git/log/:path           → version history for page
GET    /api/git/diff/:hash          → diff for a commit
POST   /api/git/commit              → manual commit
POST   /api/git/pull                → pull latest from remote + report changes
POST   /api/git/push                → push to remote

POST   /api/terminal/create         → create PTY session
WS     /api/terminal/ws/:id         → WebSocket for terminal I/O

GET    /api/agents                  → list all agent sessions (active + recent)
POST   /api/agents/run              → launch Claude Code on a task (spawns PTY with constructed prompt)
POST   /api/agents/:id/stop         → kill a running Claude Code PTY
GET    /api/agents/:id/logs         → get captured terminal output for a session
GET    /api/agents/stats            → agent activity stats

POST   /api/agents/headless         → run a one-shot `claude -p` command (auto-link, review, summarize)
                                      body: { prompt, workdir, captureOutput: true }

GET    /api/jobs                    → list all scheduled jobs
POST   /api/jobs                    → create a new job
PUT    /api/jobs/:id                → update job config
DELETE /api/jobs/:id                → delete a job
POST   /api/jobs/:id/run            → trigger job immediately
POST   /api/jobs/:id/toggle         → enable/disable a job
GET    /api/jobs/:id/history        → run history for a job
GET    /api/jobs/:id/history/:runId → logs for a specific run
GET    /api/jobs/history            → global run history (all jobs)

GET    /api/export/pdf/:path        → generate and download PDF
```

## 7. Phased Rollout

### Phase 1 — MVP (Target: 2 weeks)
- [x] Next.js project setup with App Router
- [x] File-backed storage layer (read/write/delete MD files)
- [x] Collapsible tree navigation with CRUD (add, rename, delete, drag-drop, sub pages)
- [x] Tiptap WYSIWYG editor with markdown serialization (tables, checklists, callouts, code highlighting)
- [x] Paste/drag-and-drop media upload
- [x] Auto-save with git auto-commit
- [x] Basic search (Cmd+K) with tag filtering and AI fallback
- [x] Copy/Download markdown, Copy HTML, Download PDF
- [x] Embedded website rendering (iframe)
- [x] Slash commands (/ palette)
- [x] Wiki-links [[Page Name]]
- [x] Markdown source toggle
- [x] Mobile-responsive layout

### Phase 2 — AI & Tasks (Target: +2 weeks)
- [x] Kanban task board with agent assignment (Board/List toggle)
- [x] My Tasks date view (grouped by due date)
- [x] Claude Code web terminal (multi-session tabs)
- [x] "Run with Agent" on task cards
- [x] Agent session logging and status tracking
- [x] **Scheduled Jobs engine** (node-cron, YAML config, run history)
- [x] **Jobs Manager UI** (list, create, visual cron builder, run now, view logs)
- [~] **Telegram notifications** — skipped (deferred to post-deploy)
- [~] **In-app notifications** — skipped (deferred to post-deploy)
- [x] PDF export
- [x] Version history & diff viewer with restore
- [x] Keyboard shortcuts throughout
- [x] AI Editor panel with @ file mentions
- [x] Job post-actions and template variables

### Phase 3 — AI-First Operations & Multi-Provider (Target: +2 weeks)
- [x] Multi-session agent support (parallel agents in tabs)
- [x] Agent Dashboard with stats
- [x] AI auto-linking (task ↔ KB pages)
- [ ] AI task review & enrichment ← **NEXT**
- [x] Post-completion auto-summarize (git diff → session output)
- [x] Daily digest generation
- [x] Semantic search fallback (Ask AI)
- [x] CLAUDE.md at KB root for agent context
- [~] **Gemini CLI provider plugin** — skipped (deferred)
- [~] **OpenAI Codex provider plugin** — skipped (deferred)
- [~] **API-based providers** — skipped (deferred)
- [x] Provider settings page (enable/disable, set default, configure keys)

### Phase 4 — Authentication & VPS Deployment (Target: +2 weeks)

#### 4a — GitHub OAuth Authentication
- [ ] **NextAuth.js with GitHub OAuth provider** — sign in with GitHub account
- [ ] **Session middleware** on all API routes — reject unauthenticated requests
- [ ] **User identity in header** — GitHub avatar + name, sign out button
- [ ] **Git author tracking** — every save/create/delete commits as the logged-in user (`git commit --author="Name <email>"`)
- [ ] **Version history shows real authors** — replace "Amazingg KB" with actual user who made each change
- [ ] **Agent tracking** — agent commits attributed as "Agent (triggered by {user})"
- [ ] **Activity feed** — simple `/api/activity` endpoint showing recent edits across all users (powered by `git log`)
- [ ] **Protected routes** — redirect to login page if not authenticated

**How it works:**
```
User → GitHub OAuth → NextAuth JWT session → API routes check session
                                            → Git commits use session.user as author
                                            → git log / git blame = full audit trail
```

**Key design:** No user fields in markdown frontmatter. Git history IS the user tracking layer. `git blame` shows who wrote each line, `git log --author=X` shows all changes by a user. Zero schema changes.

#### 4b — Simple Deployment (Paperclip-style)

**Goal:** One command to deploy. No Nginx config, no manual Docker orchestration. Clone → configure `.env` → `npm run deploy` (or `docker compose up`).

- [ ] **Dockerfile** — multi-stage build: install deps → build Next.js → bundle terminal server → include Claude CLI
- [ ] **docker-compose.yml** — single file, single command: `docker compose up -d`
- [ ] **`.env.example`** — copy to `.env`, fill in GitHub OAuth + domain. That's it.
- [ ] **Built-in HTTPS** — Caddy as reverse proxy (auto TLS, zero config) instead of Nginx + certbot
- [ ] **Persistent `/data` volume** — content survives container restarts
- [ ] **Health check** — `/api/health` endpoint, Docker healthcheck directive
- [ ] **Claude auth setup** — `docker compose exec kb claude login` (one-time interactive)
- [ ] **Deploy script** — `./deploy.sh` wraps build + push + restart on VPS

**Install steps (target):**
```bash
git clone https://github.com/amazingg-ai/amazingg-kb
cd amazingg-kb
cp .env.example .env        # edit: DOMAIN, GITHUB_CLIENT_ID/SECRET
docker compose up -d         # done — live at https://your-domain.com
docker compose exec kb claude login   # one-time: auth Claude CLI
```

**Stack:**
```
docker-compose.yml
├── kb (Node.js container)
│   ├── Next.js (port 3000)
│   ├── Terminal WebSocket (port 3001)
│   ├── Agent heartbeat scheduler
│   └── Claude Code CLI
├── caddy (reverse proxy)
│   ├── Auto HTTPS (Let's Encrypt)
│   ├── / → kb:3000
│   └── /ws → kb:3001
└── volumes
    └── ./data → /app/data (persistent)
```

#### 4c — Autonomous Agent System

**Concept:** Agents are team members defined as markdown files. Each agent has a role, persona, memory, and heartbeat schedule. The existing cron job system powers agent heartbeats. Agents wake up on schedule, check their tasks, do work, and go back to sleep.

**Agents are just markdown files:**
```
/data/.agents/
  ceo.md                    ← agent persona + config in frontmatter
  founding-engineer.md
  growth-marketer.md
  custom-agent.md           ← user-created
  .memory/
    ceo/                    ← persistent memory per agent
      context.md            ← rolling context window
      decisions.md          ← key decisions log
      learnings.md          ← what the agent has learned
    founding-engineer/
      context.md
      code-patterns.md
```

**Agent definition format (markdown with YAML frontmatter):**
```markdown
---
name: CEO
role: Chief Executive Officer
provider: claude-code
heartbeat: "0 8,14,20 * * *"     # 3x daily: 8am, 2pm, 8pm
budget: 100                       # max heartbeats per month
active: true
workdir: /data
focus:
  - product/roadmap
  - market/
  - people/
  - operations/
tags: [strategy, leadership, fundraising]
---

# CEO Agent — Hila's AI Co-pilot

You are the AI CEO agent for Amazingg.ai, a GPU kernel optimization startup.

## Your Responsibilities
- Review and update the product roadmap
- Track validation conversations and follow up
- Monitor competitive landscape for changes
- Prepare fundraising materials and investor updates
- Review GTM target list and suggest outreach priorities

## How You Work
- On each heartbeat, check your focus areas for recent changes
- Review open tasks assigned to you on the kanban board
- Update pages you own with new insights
- Create tasks for the human team when you find action items
- Log key decisions in your memory

## Personality
- Direct and strategic. No fluff.
- Apple-caliber quality bar
- Israeli startup energy — move fast, validate hard

## Context
Read [[Product Formulation]] and [[Roadmap]] before every session.
Always check [[People]] for conversation status updates.
```

**Pre-built agent templates:**

| Agent | Heartbeat | Focus Areas | What It Does |
|-------|-----------|-------------|-------------|
| **CEO** | 3x/day | roadmap, market, people, ops | Strategic review, follow-ups, investor prep |
| **Founding Engineer** | 4x/day | research, validations, gpu-knowledge | Technical validation, architecture docs, code review |
| **Growth Marketer** | 2x/day | market/gtm-targets, people/customers | Outreach drafts, competitor monitoring, content |
| **Research Analyst** | 1x/day | research, market/landscape | Deep dives, paper summaries, trend analysis |
| **Operations** | 1x/day | operations, tasks | Task triage, follow-up reminders, process docs |

**Heartbeat execution flow:**
```
1. Cron fires → agent wakes up
2. Load agent definition (persona MD file)
3. Load agent memory (.memory/{agent}/*.md)
4. Load focus area pages (recent changes since last heartbeat)
5. Check kanban board for tasks assigned to this agent
6. Construct prompt: persona + memory + focus context + tasks
7. Run via provider (claude -p for CLI, API call for API providers)
8. Agent reads/edits KB pages, updates tasks, creates new content
9. Save updated memory (context.md, decisions.md, learnings.md)
10. Log heartbeat result to .agents/.history/
11. Git auto-commit all changes
```

**Agent memory system:**
- **context.md** — rolling window of recent work (last N heartbeats summarized). Agent reads this on every wake-up to maintain continuity.
- **decisions.md** — append-only log of key decisions with timestamps and reasoning. Never truncated.
- **learnings.md** — things the agent discovered that should persist long-term (patterns, preferences, corrections from the human team).
- Memory files are regular markdown — humans can read, edit, or reset them anytime.
- Each heartbeat appends to context.md and prunes old entries (configurable window size, default: last 20 heartbeats).

**Agent management UI (extends existing Agent Dashboard):**
- List all agents with status: active/paused, last heartbeat time, next scheduled
- Click agent → view/edit its persona (MD file), view memory, view heartbeat history
- Create new agent from template or blank
- Pause/resume agent heartbeats
- Manual "Run Now" button (trigger immediate heartbeat)
- Memory viewer — browse context.md, decisions.md, learnings.md with edit capability
- Budget tracking — heartbeats used this month vs limit

**API routes:**
```
GET    /api/agents/personas              → list all agent persona files
GET    /api/agents/personas/:name        → read agent persona + memory
PUT    /api/agents/personas/:name        → update agent persona
POST   /api/agents/personas              → create new agent
DELETE /api/agents/personas/:name        → delete agent
POST   /api/agents/personas/:name/run    → trigger immediate heartbeat
POST   /api/agents/personas/:name/toggle → pause/resume
GET    /api/agents/personas/:name/memory → read agent memory files
PUT    /api/agents/personas/:name/memory → update agent memory
GET    /api/agents/personas/:name/history → heartbeat execution history
```

**Integration with existing systems:**
- Heartbeats use the existing **job scheduler** (node-cron) — each active agent registers a cron job
- Agent execution uses the existing **agent-manager** — spawns `claude -p` or API call
- Agents can create/update **kanban tasks** via the tasks API
- Agents can edit **KB pages** via Claude's file tools (same as AI editor panel)
- Agent changes trigger **git auto-commit** (same as manual edits)
- `.agents/` is a hidden directory — doesn't appear in the sidebar tree (like `.jobs/`)

#### 4d — Polish & Extras (deferred)
- [ ] Real-time collaborative editing (Yjs)
- [ ] Google Drive export
- [ ] Asset gallery (browse all uploaded media)
- [ ] In-app notification bell
- [ ] Telegram/Slack notifications

### Phase 5 — KB as Startup OS (DONE)
*(see below for full feature list)*

### Phase 6 — Open-Source Release as "Cabinet"

**Product name:** Cabinet
**Domain:** cabinet.dev
**GitHub:** github.com/thecabinet/cabinet
**Tagline:** "Your AI cabinet. Defined in markdown."

**Strategy:** Two versions:
- **Cabinet** (open-source) — generic startup OS, no company-specific content, interactive onboarding wizard, pre-built agent templates
- **Amazingg.ai fork** (private) — GPU-specific content, competitors, people CRM, GTM lists, research

#### 6a — Clean Generic Fork
- [ ] Strip all Amazingg-specific content from `/data` (GPU research, competitors, people, GTM lists)
- [ ] Replace with interactive onboarding wizard: "What's your startup name? Stage? How many founders?" → generates initial structure + agent personas
- [ ] Generic agent templates: CEO, Founding Engineer, Growth Marketer, Research Analyst, Operations
- [ ] Default KB structure template: product/, market/, people/, research/, operations/
- [ ] Clean branding: "Cabinet" throughout UI, favicon, logo

#### 6b — README & Landing
- [ ] Product README with GIF/video demos, one-command install, feature grid
- [ ] Architecture diagram (file-first, no database, agents as markdown)
- [ ] Comparison table vs Notion / Paperclip / Outline
- [ ] Contributing guide
- [ ] LICENSE (MIT or Apache 2.0)

#### 6c — Launch
- [ ] cabinet.dev landing page (can be an embedded app in the KB itself)
- [ ] Hacker News "Show HN" post
- [ ] Product Hunt launch
- [ ] Twitter/X thread
- [ ] r/selfhosted, r/opensource posts

### Phase 5 — KB as Startup OS (DONE)
- [x] **Full-screen app embedding** — `.app` marker file in website dirs triggers immersive mode (sidebar + AI panel auto-collapse, iframe fills viewport, "Back to KB" exit button)
- [x] **Linked repositories** — `.repo.yaml` config links KB directories to Git repos (local path + remote URL). Agents discover and read source code in context.
- [x] **Inline PDF viewer** — PDF files appear as sidebar nodes (red FileType icon), click to view with browser's native PDF renderer + "Open in new tab"
- [x] **CSV viewer/editor** — CSV files appear as sidebar nodes (green Table icon), interactive table with double-click cell editing, Tab navigation, add/delete rows/columns, source mode toggle, save with git auto-commit
- [x] **Relative URL resolution** — `./file.pdf` and `./image.png` in markdown auto-rewrite to `/api/assets/{pagePath}/file` during MD→HTML conversion
- [x] **Distinct sidebar icons** — content-type-aware icons: AppWindow (green) for apps, Globe (blue) for websites, GitBranch (orange) for repo-linked dirs, FileType (red) for PDFs, Table (green) for CSVs
- [x] **Wiki-links in MD→HTML pipeline** — `[[Page Name]]` converted to clickable styled anchors during markdown processing (not just live input rules)
- [x] **Task list fix** — GFM checkboxes post-processed to Tiptap's expected DOM structure
- [x] **Assets API PUT** — raw file write endpoint for CSV save and other non-markdown content
- [x] **KB reorganized as startup OS** — product/, market/ (competitors, landscape, segments, GTM targets), people/ (CRM with team, advisors, investors, industry contacts, customers), research/ (GPU hardware, validations, deep dives), operations/ (fundraising), presentations/
- [x] **Google Drive import** — bulk convert .docx/.html to markdown via pandoc, reorganize with frontmatter
- [x] **Sidebar independent scroll** — sidebar scrolls its tree independently from the main content area
- [x] **Hydration mismatch fix** — separated mounted/isMobile state, suppressHydrationWarning, store-based sidebar collapse
- [x] **Auto-sync from GitHub** — app runs `git pull` on page load, "Sync" button in status bar for manual pull + tree refresh, `/api/git/pull` endpoint
- [x] **Smart sidebar icons** — leaf nodes (no children) show page icon with no expand chevron; only nodes with sub-pages show folder icon + chevron
- [x] **RTL & Hebrew support** — per-page direction toggle in editor toolbar, `dir: rtl` in frontmatter, applied to WYSIWYG editor and source mode. Remaining: auto-detect from content, per-block direction (mixed LTR/RTL), Unicode search optimization

## 8. Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Storage | Filesystem + Git | Portable, version-controlled, readable outside the app |
| Editor | Tiptap (WYSIWYG) | Best balance of UX and markdown fidelity |
| RTL/i18n | Per-page `dir` in frontmatter + auto-detect | No global toggle — each page controls its own direction. Mixed content works. |
| Images | Files on disk, relative links | Never bloat markdown, files stay portable |
| Embedded sites | iframe detection + `.app` marker | Zero config — drop HTML in a folder. `.app` = full-screen mode |
| PDF/CSV | First-class sidebar nodes | Click to view/edit inline — not hidden behind download links |
| Linked repos | `.repo.yaml` convention | Agents discover codebases linked to KB sections without hardcoding paths |
| Tasks | YAML in files | Consistent with file-first philosophy |
| Search | In-memory index | Fast, no external deps, good enough for <10K pages |
| Terminal | xterm.js + node-pty | Real terminal, not a fake shell |
| AI architecture | Provider-agnostic agent layer | Pluggable: CLI-based (Claude Code, Gemini, Codex) or API-based — implement once, swap providers |
| Phase 1 AI | Claude Code Max (CLI via PTY) | Already available, unlimited usage, no API keys |
| AI light ops | Default provider headless mode | `claude -p` now, API calls later — same interface |
| Agent tracking | In-memory session manager | Simple — track PTY pids, capture output, no Redis |
| Scheduled jobs | YAML files + node-cron | File-first (consistent with KB), no database, editable outside the UI |
| Job history | Log files on disk | Portable, grep-able, git-trackable if desired |
| Authentication | Simple .env password | No database, no OAuth complexity. Upgrade to GitHub OAuth later if needed. |
| User tracking | Git commit author | No frontmatter pollution — `git log --author` and `git blame` are the audit trail |
| Activity feed | `git log` across all users | No activity table needed — git IS the activity log |
| Open-source strategy | Dual fork (Cabinet + Amazingg) | Generic open-source product + private startup fork with company-specific data |
| Deployment | Docker Compose + Caddy | Single command (`docker compose up`), auto HTTPS, zero Nginx config |
| Autonomous agents | MD files + cron heartbeats + memory | Agents are editable personas, not black boxes. Memory is markdown humans can read/edit. |

## 9. Non-Goals (for now)

- Public sharing / published pages
- Database (everything is files)
- Mobile app
- Plugin/extension system
- ~~Spreadsheet/database views (like Notion databases)~~ — CSV viewer/editor now covers this
- Multi-provider support in Phase 1 (Claude Code Max only — Gemini/Codex/API in Phase 3)
- ~~Autonomous agent loops without human approval~~ — now supported via heartbeat system with budget limits

## 10. Open Questions

1. ~~**Domain/project name**~~ — **Resolved:** "Cabinet" (cabinet.dev). Internal fork stays "Amazingg KB".
2. ~~**Theming**~~ — **Resolved:** Dark mode default, toggle available.
3. **Max file size** for uploads? (Suggested: 50MB default, configurable)
4. **Git remote** — auto-push to GitHub/GitLab, or manual only?
5. **Task notifications** — deferred. Telegram/Slack/email in Phase 4d.
6. **Max concurrent agents** — how many Claude Code sessions running in parallel? (Max subscription may have limits)
7. ~~**Agent approval gates**~~ — **Resolved:** Agents auto-commit. Budget limits prevent runaway. Humans can review via version history + git diff.
8. ~~**Agent templates**~~ — **Resolved:** 5 pre-built templates (CEO, Founding Engineer, Growth Marketer, Research Analyst, Operations). Users can create custom agents as MD files.
9. ~~**VPS auth**~~ — **Resolved:** Simple .env password for auth. `docker compose exec kb claude login` for CLI auth on server.
10. **Provider preference per task type** — deferred to Phase 3 multi-provider work.
11. **Agent-to-agent communication** — Full org chart via kanban tasks (formal delegation) + markdown message files (quick context sharing). All documented in .agents/.messages/.
