# Progress

[2026-03-31] Phase 1, Step 1: Added `better-sqlite3` dependency and created DB initialization. Created `server/db.ts` and `src/lib/db.ts` (shared accessor for Next.js API routes) with automatic schema migrations. Initial migration (`server/migrations/001_initial.sql`) creates tables: sessions, messages, activity, job_runs, mission_tasks, schema_version. Database stored at `/data/.cabinet.db` with WAL mode enabled.

[2026-03-31] Phase 1, Step 2: Created agent library templates in `/data/.agents/.library/` for CEO, Editor, Content Marketer, SEO Specialist, Sales Agent, and QA Agent. Each template has a `persona.md` with full frontmatter (name, slug, emoji, type, department, goals, channels, etc.) and markdown body with role instructions. Added API endpoints: `GET /api/agents/library` (list templates) and `POST /api/agents/library/[slug]/add` (instantiate agent from template).
