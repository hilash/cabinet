# Cabinet Agent Loop — PRD Implementation

You are an autonomous development agent working on Cabinet. Your job is to implement the next step from the PRD, one phase at a time.

## How to work

1. **Read `PRD.md`** to understand the full system design.
2. **Read `PROGRESS.md`** to see what's already been done.
3. **Read `CLAUDE.md`** for project rules and conventions.
4. **Identify the current phase and next unfinished step** from the PRD Implementation Phases (Section 11).
5. **Implement that ONE step fully** — write the code, ensure it compiles (`npm run build`), and verify it works.
6. **Update `PROGRESS.md`** with a dated entry describing what you did.
7. **Commit your changes** with a descriptive message.

## Phase Execution Order

Work through these phases in strict order. Within each phase, complete all sub-steps before moving to the next phase.

### Phase 1: Foundation (Agent Restructure)
1. Add `better-sqlite3` dependency and create DB initialization in `server/db.ts` with schema migrations
2. Create agent library templates in `/data/.agents/.library/` (CEO, Editor, Content Marketer, SEO, Sales, QA)
3. Build new agent list view — card grid (`src/components/agents/agent-list.tsx`)
4. Build agent detail view with tabs: Definition, Jobs, Skills, Sessions, Goals (`src/components/agents/agent-detail.tsx`)
5. Move jobs under agents — restructure job storage from `/data/.jobs/` to `/data/.agents/{slug}/jobs/`
6. Update sidebar navigation — add Team section (Agents, Missions, Chat) and System section (Activity, Settings)
7. Update `app-shell.tsx` routing and `app-store.ts` section types for new navigation

### Phase 2: Onboarding
1. Build onboarding wizard component (5 questions) — `src/components/onboarding/onboarding-wizard.tsx`
2. Build team suggestion view — `src/components/onboarding/team-suggestion.tsx`
3. Create `/api/onboarding/setup` endpoint — instantiate agents from library templates, create default channels, initial CEO mission
4. Auto-detect first run (no `onboarding-complete` flag) and show onboarding wizard

### Phase 3: Missions
1. Build mission storage layer — file I/O for `/data/.missions/` + SQLite for task status tracking
2. Build mission list view — `src/components/missions/mission-list.tsx`
3. Build mission detail view — `src/components/missions/mission-detail.tsx`
4. Build create mission dialog — `src/components/missions/create-mission-dialog.tsx`
5. Wire task assignment to agent inboxes and mission progress tracking

### Phase 4: Chat
1. Build chat storage layer — SQLite for messages, file for channel config
2. Build channel list + channel view — `src/components/chat/channel-list.tsx`, `channel-view.tsx`
3. Build message posting — human + agent message flow via API
4. Wire agent runs to post summaries in channels on job completion
5. Message → Task conversion (button on messages to create mission tasks)

### Phase 5: Activity Feed
1. Build activity event logging — SQLite events table, `POST /api/activity` internal endpoint
2. Wire all agent/mission/chat events to activity log
3. Build activity feed view with filters — `src/components/activity/activity-feed.tsx`

### Phase 6: Server & Polish
1. Extend `terminal-server.ts` into `cabinet-daemon.ts` — add job scheduler + WebSocket event channels
2. Add agent @mention triggering from chat
3. Agent goal tracking with live progress bars
4. Skill management UI in agent detail
5. `npm run start` single command to launch Next.js + daemon

## Rules

- **Always read files before editing them.** Never replace entire files.
- **Run `npm run build`** after making changes to verify they compile.
- **Follow existing patterns** in the codebase. Use the same libraries, file structure, and conventions.
- **shadcn/ui uses base-ui** (not Radix) — no `asChild` prop.
- **One step per run.** Pick the next unfinished step, implement it fully, commit, and stop.
- **Update PROGRESS.md** after every change.
- **Don't break existing functionality.** If unsure, read the relevant code first.
- **When you finish a step, output exactly what you completed** so the loop can track progress.

<promise>All 6 PRD phases are fully implemented and committed</promise>
