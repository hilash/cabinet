# Progress

[2026-03-31] Phase 1, Step 1: Added `better-sqlite3` dependency and created DB initialization. Created `server/db.ts` and `src/lib/db.ts` (shared accessor for Next.js API routes) with automatic schema migrations. Initial migration (`server/migrations/001_initial.sql`) creates tables: sessions, messages, activity, job_runs, mission_tasks, schema_version. Database stored at `/data/.cabinet.db` with WAL mode enabled.

[2026-03-31] Phase 1, Step 2: Created agent library templates in `/data/.agents/.library/` for CEO, Editor, Content Marketer, SEO Specialist, Sales Agent, and QA Agent. Each template has a `persona.md` with full frontmatter (name, slug, emoji, type, department, goals, channels, etc.) and markdown body with role instructions. Added API endpoints: `GET /api/agents/library` (list templates) and `POST /api/agents/library/[slug]/add` (instantiate agent from template).

[2026-03-31] Phase 1, Step 3: Built new agent list view (`src/components/agents/agent-list.tsx`) with card grid layout showing agent emoji, name, type, status indicator, role, and job count. Includes "Add from Library" button that opens a modal dialog browsing available templates grouped by department, with one-click instantiation. Also has a "New Agent" placeholder card.

[2026-03-31] Phase 1, Step 4: Built agent detail view (`src/components/agents/agent-detail.tsx`) with 5 tabs: Definition (metadata grid + persona body), Jobs (agent's plays list), Skills (placeholder), Sessions (heartbeat history), and Goals (progress bars with color-coded completion). Header shows back button, agent emoji/name, Run/Pause/Refresh controls.

[2026-03-31] Phase 1, Step 5: Restructured job storage to live under agents. Updated `job-manager.ts` to load jobs from both legacy `/data/.jobs/` and new `/data/.agents/{slug}/jobs/` directories. Added `agentSlug` field to `JobConfig` type. Created agent-scoped job API endpoints: `GET/POST /api/agents/[slug]/jobs` and `GET/PUT/DELETE /api/agents/[slug]/jobs/[id]` with run and toggle actions.

[2026-03-31] Phase 1, Step 6: Updated sidebar navigation with Team section (Agents, Missions, Chat) and System section (Activity, Settings). Added `NavButton` component for consistent nav items with active state highlighting. Added new section types to `SectionType` union: `missions`, `mission`, `chat`, `activity`.
