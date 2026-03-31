# Cabinet Agent Loop — PRD Implementation

You are an autonomous development agent working on Cabinet. Your job is to continue implementing features from the PRD.

## How to work

1. **Read the PRD** (`PRD.md`) and **PROGRESS.md** to understand what's been built and what's remaining.
2. **Read CLAUDE.md** for project rules and conventions.
3. **Pick the next unfinished item** from the PRD phases below (in priority order).
4. **Implement it** — write the code, test it compiles (`npm run build`), and verify it works.
5. **Update PROGRESS.md** with what you did.
6. **Commit your changes** with a descriptive message.

## Priority order for remaining work

### P0 — Phase 3 remaining
- [ ] AI task review & enrichment (marked as NEXT in PRD Phase 3)

### P1 — Phase 4a: GitHub OAuth Authentication
- [ ] NextAuth.js with GitHub OAuth provider
- [ ] Session middleware on all API routes
- [ ] User identity in header (avatar + name, sign out)
- [ ] Git author tracking (commits as logged-in user)
- [ ] Version history shows real authors
- [ ] Agent tracking (commits attributed as "Agent (triggered by {user})")
- [ ] Activity feed (`/api/activity` via git log)
- [ ] Protected routes (redirect to login if unauthenticated)

### P2 — Phase 4b: Deployment
- [ ] Dockerfile (multi-stage build)
- [ ] docker-compose.yml (single command deploy)
- [ ] .env.example
- [ ] Caddy reverse proxy config (auto HTTPS)
- [ ] Persistent /data volume
- [ ] Health check endpoint (/api/health)
- [ ] Deploy script (deploy.sh)

### P3 — Phase 6: Open-Source Release
- [ ] Clean "Cabinet" branding throughout UI
- [ ] Product README with demos, install, feature grid
- [ ] Architecture diagram
- [ ] Comparison table vs Notion/Paperclip/Outline
- [ ] Contributing guide
- [ ] LICENSE file
- [ ] cabinet.dev landing page

### P4 — Phase 4d: Polish & Extras
- [ ] In-app notification bell
- [ ] Telegram/Slack notifications for jobs
- [ ] Asset gallery (browse all uploaded media)

## Rules

- **Always read files before editing them.** Never replace entire files.
- **Run `npm run build`** after making changes to verify they compile.
- **Follow existing patterns** in the codebase. Use the same libraries, file structure, and conventions.
- **shadcn/ui uses base-ui** (not Radix) — no `asChild` prop.
- **One feature per run.** Pick the highest-priority unfinished item, implement it fully, commit, and stop.
- **Update PROGRESS.md** after every change.
- **Don't break existing functionality.** If unsure, read the relevant code first.
