# AI Claude Editor Flow

## The Big Picture

This is **not** a simple API call. Every AI edit opens a real PTY terminal session where Claude CLI runs live, with output streamed to an embedded xterm.js terminal in the browser.

---

## End-to-End Flow

### 1. Opening the Panel

`editor.tsx` has an "AI" button → calls `openAI()` from `ai-panel-store`.  
`app-shell.tsx` renders `<AIPanel>` as a 480px right sidebar when `!aiPanelCollapsed`.

---

### 2. User Submits an Instruction

**`src/components/ai-panel/ai-panel.tsx` → `handleSubmit()`**

**@mentions**: if the user typed `@SomePage`, each mention is:
- detected by `src/components/shared/mention-input.tsx`
- fetched via `GET /api/pages/{path}`
- appended to the prompt as: `--- Title (path) ---\n{content}`

**Prompt construction:**
```
You are editing the page at /data/{currentPath}.
{instruction + @mention context}

Work in the /data directory. Edit files directly. After editing, briefly confirm what you changed.
```

A session is created in `ai-panel-store` with `status: "running"`, then a `<WebTerminal>` mounts and opens a WebSocket to `ws://localhost:3001`.

---

### 3. Daemon Spawns Claude CLI

**`server/cabinet-daemon.ts`** (unified daemon on port 3001)

WebSocket query params: `id={sessionId}&prompt={encoded}`

Server spawns a PTY:
```ts
pty.spawn("claude", ["--dangerously-skip-permissions", prompt], {
  cwd: DATA_DIR,   // /data
  cols: 120, rows: 30,
  env: { FORCE_COLOR: "3", TERM: "xterm-256color", ... }
})
```

Claude binary is found by searching in order:
1. `$HOME/.local/bin/claude`
2. `/usr/local/bin/claude`
3. `/opt/homebrew/bin/claude`
4. `which claude`

---

### 4. Live Streaming

PTY output → WebSocket frames → `web-terminal.tsx` → xterm.js renders it in the browser.  
The user watches Claude work in real time with full ANSI color output.

Claude reads the markdown file at `/data/{pagePath}/index.md`, makes targeted edits directly on disk, then writes a brief confirmation to stdout.

---

### 5. Session Ends → Editor Reloads

When Claude exits (`ai-panel.tsx → handleSessionEnd()`):

1. Fetches buffered output via `GET /session/{id}/output` on the daemon
2. Persists session to disk via `POST /api/agents/editor-sessions` → `/data/.agents/.history/editor-sessions.jsonl`
3. Calls `markSessionCompleted()` → status: `"completed"`
4. Calls `loadPage(currentPath)` in `editor-store` → fetches `GET /api/pages/{path}` → editor re-renders with Claude's changes

---

### 6. Session Persistence / Reconnection

| Layer | Storage | Duration |
|---|---|---|
| Running sessions | Browser `sessionStorage` (`ai-panel-running-sessions`) | Page lifetime / survives refresh |
| PTY state + output | Daemon in-memory map | 30 min after exit |
| Completed sessions | `/data/.agents/.history/editor-sessions.jsonl` | Permanent |

If the user navigates away while Claude is running:
- WebTerminal stays mounted hidden (`display: none`)
- WebSocket stays live
- User sees "Running on other page" in panel
- Navigate back → terminal reappears with full history

If the user refreshes the browser:
- `sessionStorage` survives → sessions restored with `reconnect: true`
- WebTerminal reconnects to existing PTY → daemon replays buffered output

---

## Key Files

| File | Role |
|---|---|
| `src/components/ai-panel/ai-panel.tsx` | Instruction input, @mentions, session lifecycle |
| `src/components/shared/mention-input.tsx` | @mention detection + page content fetching |
| `src/components/terminal/web-terminal.tsx` | xterm.js + WebSocket client |
| `src/stores/ai-panel-store.ts` | Session state (Zustand) + sessionStorage sync |
| `src/stores/editor-store.ts` | Page content, triggers reload after AI edit |
| `src/components/layout/app-shell.tsx` | Layout: renders AIPanel as right sidebar |
| `src/components/editor/editor.tsx` | Editor "AI" button → opens panel |
| `server/cabinet-daemon.ts` | PTY manager, WebSocket server, job scheduler |
| `src/app/api/agents/editor-sessions/route.ts` | Session history CRUD (JSONL) |
| `src/app/api/ai/edit/route.ts` | Legacy sync endpoint — **not used by the panel** |

---

## Notable: `--dangerously-skip-permissions`

Every Claude invocation passes this flag so Claude can read/write files in `/data` without prompting for confirmation. The `cwd` is always `DATA_DIR`, so Claude operates within the knowledge base directory.

---

## Legacy: `/api/ai/edit`

`src/app/api/ai/edit/route.ts` exists but is **not used** by the panel. It's a synchronous approach (2-min timeout) that spawns Claude via `child_process.spawn`, waits for it to finish, then re-reads the file. The panel replaced this with the live PTY/WebSocket approach.

---

# Agents Panel

## The Big Picture

The Agents panel is a **completely separate execution model** from the AI editor. Agents are autonomous — they run on a schedule or on demand, maintain persistent memory, track goals, and message each other. There is no PTY, no WebSocket terminal, no interactive input. Claude is spawned as a plain child process and its output is parsed for structured updates.

---

## Core Concepts

### Persona
A persona is an agent's identity and configuration, stored as a markdown file with YAML frontmatter:
- **New format:** `/data/.agents/{slug}/persona.md`
- **Legacy format:** `/data/.agents/{slug}.md`

Frontmatter fields include: `name`, `role`, `heartbeat` (cron), `budget` (max heartbeats/month), `active`, `focus` (KB pages), `goals`, `plays`, `workdir`.  
The markdown body is the agent's instruction set — what it should do each heartbeat.

### Heartbeat
A heartbeat is one execution cycle of an agent. The agent reads its memory, inbox, goals, and assigned plays, then Claude runs and produces structured output that gets parsed back into the system.

### Play
A play is a reusable action script stored in `/data/.playbooks/plays/{slug}.md`. Plays can be assigned to personas (included in the heartbeat prompt) or triggered directly. They support cron schedules and downstream triggers (`on_complete`, `goal_behind`).

---

## End-to-End Flow: User Clicks "Run Now"

### 1. UI Trigger

**`src/components/agents/agent-dashboard.tsx` → `PersonaCard.handleRun()`**

```ts
fetch(`/api/agents/personas/${persona.slug}`, {
  method: "PUT",
  body: JSON.stringify({ action: "run" })
})
```

The API returns immediately (`ok: true`). The frontend sets a local `running` state, then polls `GET /api/agents` every ~10 seconds to pick up status changes.

---

### 2. API Route

**`src/app/api/agents/personas/[slug]/route.ts` → PUT handler**

```ts
if (body.action === "run") {
  runHeartbeat(slug).catch(...)   // async, non-blocking
  return NextResponse.json({ ok: true, message: "Heartbeat triggered" })
}
```

---

### 3. Heartbeat Engine

**`src/lib/agents/heartbeat.ts` → `runHeartbeat(slug)`**

This is the core of the agent system. It assembles everything the agent needs into one large prompt:

1. Loads persona definition (`persona-manager.readPersona`)
2. Loads agent memory: `context.md`, `decisions.md`, `learnings.md`
3. Loads inbox messages from other agents
4. Loads focus area pages (KB pages listed in `persona.focus`)
5. Loads assigned plays
6. Loads goal state
7. Loads task inbox

Then spawns Claude:

```ts
spawn("claude", [
  "--dangerously-skip-permissions",
  "-p", prompt,
  "--output-format", "text"
], {
  cwd: workdir,
  stdio: ["pipe", "pipe", "pipe"]
})
```

**Key differences from the AI editor:**
- `stdio: ["pipe", "pipe", "pipe"]` — plain pipes, not a PTY
- Output is captured in memory, not streamed to a browser terminal
- Retry logic: up to 3 attempts (5 min timeout on first, 3 min on retries)
- After 3 consecutive failures, the agent is auto-paused

---

### 4. Output Parsing

Agents end their response with a structured ` ```memory ` block:

```
```memory
CONTEXT_UPDATE: [one paragraph summary of what was done]
DECISION: [key decision made]
LEARNING: [new insight]
GOAL_UPDATE [metric_name]: +N
MESSAGE_TO [agent-slug]: [message for another agent]
SLACK [channel-name]: [message to post]
TASK_CREATE [target-agent-slug] [priority]: title | description
TASK_COMPLETE [task-id]: result
```
```

The heartbeat engine parses this block and:
- Updates `context.md`, `decisions.md`, `learnings.md` (rolling 20-entry history)
- Writes messages to `/data/.agents/.messages/{target-slug}/`
- Updates goal metrics in `goals.json`
- Creates/completes tasks for other agents
- Posts to Slack channels
- Records the full heartbeat result in `/data/.agents/.history/{slug}.jsonl`

---

### 5. Scheduled Heartbeats

When agents are loaded on daemon startup, active agents under budget are scheduled via `node-cron`:

**`src/lib/agents/persona-manager.ts` → `registerHeartbeat(slug, cronExpr)`**

```ts
cron.schedule(cronExpr, () => {
  runHeartbeat(slug).catch(...)
})
```

The daemon also broadcasts WebSocket events over `/events` so the frontend can react without polling:
- `job:started` — heartbeat began
- `agent:output` — chunk of output
- `job:completed` — heartbeat finished

---

## Agent Memory Layout on Disk

```
/data/.agents/
├── {slug}/
│   ├── persona.md              # Identity + instructions (frontmatter + body)
│   ├── memory/
│   │   ├── context.md          # Rolling action history (20 entries)
│   │   ├── decisions.md        # Key decisions
│   │   ├── learnings.md        # Long-term insights
│   │   ├── goals.json          # Goal metrics (current/target/floor)
│   │   └── stats.json          # heartbeatsUsed, lastHeartbeat
│   ├── sessions/
│   │   └── 2024-04-03T....txt  # Full raw output per heartbeat
│   └── workspace/              # Agent's working output directory
├── .messages/
│   └── {slug}/                 # Inbox messages from other agents
└── .history/
    └── {slug}.jsonl            # Heartbeat execution history
```

---

## Key Files

| File | Role |
|---|---|
| `src/components/agents/agent-dashboard.tsx` | Persona cards, "Run Now" button |
| `src/components/agents/agent-session-view.tsx` | Detail view, output display |
| `src/app/api/agents/personas/[slug]/route.ts` | Persona control (run, toggle, config) |
| `src/app/api/agents/headless/route.ts` | Synchronous single-run execution |
| `src/lib/agents/heartbeat.ts` | Core execution engine (`runHeartbeat`) |
| `src/lib/agents/persona-manager.ts` | Persona CRUD + cron scheduling |
| `src/lib/agents/agent-manager.ts` | Session tracking for ad-hoc runs |
| `src/lib/agents/play-manager.ts` | Play loading + `executePlay()` |
| `src/lib/agents/goal-manager.ts` | Goal metric read/write |
| `src/lib/agents/trigger-engine.ts` | Downstream trigger evaluation |
| `server/cabinet-daemon.ts` | WebSocket event bus for real-time UI updates |

---

## Comparison: AI Editor vs Agents Panel

| Aspect | AI Editor | Agents Panel |
|---|---|---|
| **Spawn method** | `pty.spawn()` — full PTY | `child_process.spawn()` — stdio pipes |
| **Interactivity** | Live terminal (user can type) | Non-interactive, output only |
| **Output delivery** | Streamed over WebSocket to xterm.js | Captured in memory, then parsed |
| **Trigger** | User opens panel + submits instruction | Cron schedule or manual "Run Now" |
| **Memory** | None — edits file directly | Persistent: context, decisions, learnings, goals |
| **Output structure** | Free-form (Claude's confirmation message) | Structured `memory` block parsed for side-effects |
| **Session storage** | Daemon PTY map + sessionStorage | In-memory session map + JSONL on disk |
| **Multi-agent** | No | Yes — agents message each other via inbox |
