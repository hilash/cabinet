# Progress

[2026-03-31] Phase 1, Step 1: Added `better-sqlite3` dependency and created DB initialization. Created `server/db.ts` and `src/lib/db.ts` (shared accessor for Next.js API routes) with automatic schema migrations. Initial migration (`server/migrations/001_initial.sql`) creates tables: sessions, messages, activity, job_runs, mission_tasks, schema_version. Database stored at `/data/.cabinet.db` with WAL mode enabled.

[2026-03-31] Phase 1, Step 2: Created agent library templates in `/data/.agents/.library/` for CEO, Editor, Content Marketer, SEO Specialist, Sales Agent, and QA Agent. Each template has a `persona.md` with full frontmatter (name, slug, emoji, type, department, goals, channels, etc.) and markdown body with role instructions. Added API endpoints: `GET /api/agents/library` (list templates) and `POST /api/agents/library/[slug]/add` (instantiate agent from template).

[2026-03-31] Phase 1, Step 3: Built new agent list view (`src/components/agents/agent-list.tsx`) with card grid layout showing agent emoji, name, type, status indicator, role, and job count. Includes "Add from Library" button that opens a modal dialog browsing available templates grouped by department, with one-click instantiation. Also has a "New Agent" placeholder card.

[2026-03-31] Phase 1, Step 4: Built agent detail view (`src/components/agents/agent-detail.tsx`) with 5 tabs: Definition (metadata grid + persona body), Jobs (agent's plays list), Skills (placeholder), Sessions (heartbeat history), and Goals (progress bars with color-coded completion). Header shows back button, agent emoji/name, Run/Pause/Refresh controls.

[2026-03-31] Phase 1, Step 5: Restructured job storage to live under agents. Updated `job-manager.ts` to load jobs from both legacy `/data/.jobs/` and new `/data/.agents/{slug}/jobs/` directories. Added `agentSlug` field to `JobConfig` type. Created agent-scoped job API endpoints: `GET/POST /api/agents/[slug]/jobs` and `GET/PUT/DELETE /api/agents/[slug]/jobs/[id]` with run and toggle actions.

[2026-03-31] Phase 1, Step 6: Updated sidebar navigation with Team section (Agents, Missions, Chat) and System section (Activity, Settings). Added `NavButton` component for consistent nav items with active state highlighting. Added new section types to `SectionType` union: `missions`, `mission`, `chat`, `activity`.

[2026-03-31] Phase 1, Step 7: Updated `app-shell.tsx` routing to use new `AgentList` and `AgentDetail` components for agents/agent sections. Added placeholder views for missions, chat, and activity sections. Onboarding completion now navigates to agents view instead of mission-control. Phase 1 (Foundation) is now complete.

[2026-03-31] Phase 2 (Onboarding): Rewrote onboarding wizard with PRD's 5-question flow (company name, description, top 3 goals, team size, immediate priority) plus smart team suggestion step that recommends agents based on user answers. Created `/api/onboarding/setup` endpoint that: saves company config, marks onboarding complete, instantiates agents from library templates with company context injected, creates default chat channels (#general + department channels), and sets up channel directories. Existing first-run detection in app-shell already works with the new setup. Phase 2 complete.

[2026-03-31] Phase 3 (Missions): Built complete mission system. Storage layer (`src/lib/missions/mission-io.ts`) combines file-based mission definitions (`/data/.missions/{id}/mission.md` with frontmatter) and SQLite for task tracking (using mission_tasks table). Full REST API: `GET/POST /api/missions`, `GET/PUT/DELETE /api/missions/[id]`, `POST /api/missions/[id]/tasks`, `PUT/DELETE /api/missions/[id]/tasks/[tid]`. UI components: `mission-list.tsx` (card list with progress bars, grouped by active/completed), `mission-detail.tsx` (goal display, progress bar, task list with status icons, inline task creation), `create-mission-dialog.tsx` (title, goal, output path form). Wired into app-shell routing. Phase 3 complete.

[2026-03-31] Phase 4 (Chat): Built complete internal chat system. Storage layer (`src/lib/chat/chat-io.ts`) uses file-based channel config (`/data/.chat/channels.json`) and SQLite messages table for message storage. REST API: `GET/POST /api/chat/channels` (list/create channels), `GET/POST /api/chat/channels/[slug]` (get messages/post message/pin). UI: `channel-list.tsx` (sidebar with channel list, create new channel), `channel-view.tsx` (message thread with date separators, message input, pin toggle), `chat-page.tsx` (layout combining channel list and view). Messages poll every 5 seconds. Human can post messages; agent message posting wired via API. Phase 4 complete.

[2026-03-31] Phase 5 (Activity Feed): Built activity event logging system. Storage layer (`src/lib/activity/activity-io.ts`) uses SQLite activity table with support for agent, event type, summary, details, links, mission, and channel fields. REST API: `GET /api/activity` (paginated, filterable by agent/type) and `POST /api/activity` (internal logging). UI: `activity-feed.tsx` with chronological timeline grouped by date, color-coded event type dots, filter tabs (All, Agent Runs, Completions, Errors). Wired into app-shell routing. Phase 5 complete.

[2026-03-31] Phase 6 (Server & Polish): Created `cabinet-daemon.ts` extending terminal server with job scheduler (scans agent directories for cron jobs, executes via Claude CLI), WebSocket event bus (broadcast channels for job:started, job:completed, agent:output events), SQLite job run logging, and HTTP trigger endpoint. Updated package.json with `dev:daemon`, `start`, `start:daemon` scripts so `npm run start` launches both Next.js and daemon. Added @mention detection in chat message posting (returns detected agent slugs). Chat messages now log to activity feed. Removed unused PlaceholderSection. All 6 PRD phases implemented.

[2026-03-31] Fixed cabinet-daemon.ts to include PTY terminal server functionality. The daemon was missing the PTY session management from terminal-server.ts, causing the AI panel to show "Connection error". Merged full PTY support (spawn, reconnect, detach, output capture) into the daemon using noServer WebSocket routing: root path for PTY terminals, /events path for event bus. Also added /sessions and /session/:id/output HTTP endpoints for session management.

[2026-03-31] Fixed agents system — core bug: `listPersonas()` and `readPersona()` only looked for flat files (`{slug}.md`) but PRD restructured agents into directories (`{slug}/persona.md`). Updated persona-manager.ts to support both formats (directory-based first, flat file fallback). Also updated `writePersona` to create directory structure and `deletePersona` to handle directories. Removed mission-control as default view — app now defaults to agents list. Cleaned up all mission-control references from app-shell, tree-view, keyboard-shortcuts, and app-store.

[2026-03-31] Fixed onboarding channel creation — setup endpoint now creates channels from agent `channels` fields (not just departments), so every channel an agent references (#general, #marketing, #content, #leadership, #sales) gets created with correct member lists. Leadership agents are added to all channels. Fixed company config format to use nested `company` object. Uses `wx` flag to avoid overwriting existing messages on re-onboard.

[2026-04-03] Moved Settings from the System nav section to a gear icon button at the bottom of the sidebar, next to the + New Page button on the right.

[2026-04-03] Redesigned agent detail panel: Sessions tab now has a ChatGPT/Claude Code-style session sidebar on the left (session list with status, timestamp, duration) and a content panel on the right showing session output. New session view has centered prompt input. Other tabs (Definition, Jobs, Skills, Goals) remain as-is.

[2026-04-03] Removed Activity and Missions features entirely (nav items, components, app-shell routing, store types, logActivity calls from chat). Redesigned agent detail view: replaced horizontal tabs with vertical sidebar navigation (Definition, Goals, Skills, Jobs, Sessions). Each agent maps to a real subdir on disk at /data/.agents/{slug}/. Updated PRD to reflect all removals and new agent detail layout.

[2026-04-03] Created LLM Comparison embedded app at /data/llm-comparison/ with .app marker for full-screen mode. Interactive side-by-side comparison of 13 LLMs (Claude, GPT, Gemini, DeepSeek, Llama, Grok, Mistral) with benchmark bar charts, feature diff grid, pricing calculator, and tier filters.

[2026-04-03] Removed Chat section from sidebar and routing. Removed Goals tab from agent detail view. Added collapsible agent list in sidebar under Agents — each agent shows emoji, name, and active status dot, clicking navigates directly to the agent detail.

[2026-04-03] Added General agent as a permanent entry at the top of the sidebar agent list (always present, not fetched from API). Editor agent is sorted to appear second, before the rest of the agents.

[2026-04-03] Updated PRD to reflect current state: removed Chat and Goals sections, documented collapsible agent list in sidebar with General (always present) and Editor (sorted first) as defaults, updated sidebar diagram, removed chat storage/API/components references, simplified implementation phases, updated glossary.

[2026-04-03] Fixed AI panel terminal height: when a Claude session is running, the terminal now fills all available vertical space (flex-1) instead of being capped at 300px. Uses min-h-[200px] as a floor.

[2026-04-03] Agent Sessions tab now spawns a real Claude Code terminal (WebTerminal) instead of calling the headless API. When sending a prompt, a live interactive terminal session appears with the agent's persona as context — same component used by the AI Editor panel. Session list sidebar shows a spinning indicator for live sessions.

[2026-04-03] Made agent Definition tab fully editable: click any field (department, type, heartbeat, workspace) to edit inline. Persona instructions have an Edit button that opens a textarea. Removed budget and channels fields. Jobs tab now supports add/remove/edit: create new jobs with name+cron, click cron to edit schedule inline, toggle enabled/disabled, delete jobs.

[2026-04-03] Added CronPicker component with 15 human-readable presets (Every hour, Weekdays at 9am, etc.) plus Custom input. Used in: agent heartbeat field (Definition tab), add-job form (Jobs tab), and inline job schedule editor. Cron values show both the expression and human label.

[2026-04-03] Added job description/prompt field — jobs now have a body that serves as the prompt sent to the agent. Visible as a preview on the job card, editable in the expanded edit form. Add-job form also has a prompt textarea. Persona instructions now render as formatted markdown (prose) using a /api/ai/render-md endpoint, with click-to-edit switching to raw markdown textarea. Added @tailwindcss/typography for prose styling.

[2026-04-03] Replaced emoji with Lucide icons for agents in the sidebar. Each agent slug maps to a specific icon: General=Bot, Editor=Pencil, CEO=Crown, Content Marketer=Megaphone, SEO=Search, QA=ShieldCheck, Sales=BarChart3, Developer=Code. Unknown agents fall back to Bot icon.

[2026-04-03] Removed Skills tab from agent detail view. Added 14 new agent library templates (20 total): COO, CFO, CTO, Product Manager, UX Designer, Data Analyst, Social Media Manager, Growth Marketer, Customer Success, Copywriter, DevOps Engineer, People Ops, Legal Advisor, Researcher. Each has full persona.md with role description, responsibilities, and working style. Updated sidebar icon mapping for all new agent types.
