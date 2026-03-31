# Progress

[2026-03-31] Phase 1, Step 1: Added `better-sqlite3` dependency and created DB initialization. Created `server/db.ts` and `src/lib/db.ts` (shared accessor for Next.js API routes) with automatic schema migrations. Initial migration (`server/migrations/001_initial.sql`) creates tables: sessions, messages, activity, job_runs, mission_tasks, schema_version. Database stored at `/data/.cabinet.db` with WAL mode enabled.
