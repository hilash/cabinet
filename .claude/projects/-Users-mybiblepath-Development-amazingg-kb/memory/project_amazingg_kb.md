---
name: amazingg-kb project overview
description: Startup admin panel / knowledge base — key tech decisions and scope
type: project
---

Notion-like knowledge base admin panel for a 2-person startup.

**Stack:** Next.js + Node.js
**Deployment:** Local now, VPS later
**Auth:** Planned but deferred — no multi-user auth yet

Key decisions:
- **AI-first company** — agents are first-class citizens, not a bolt-on
- All content stored as markdown files on disk, hierarchical directory structure
- Images/files/videos saved as files next to MD (NEVER embedded in markdown)
- WYSIWYG editor (Tiptap) with paste-to-upload for media
- Directories containing index.html render as iframes (embedded websites)
- **Provider-agnostic agent layer** — supports CLI agents (Claude Code, Gemini CLI, Codex) and API agents (Anthropic, OpenAI, Google)
- **Phase 1: Claude Code Max only** — user has Max subscription, no API keys needed
- Future: Gemini CLI, Codex CLI, and API-based providers in Phase 3
- CLI agents launched in browser via xterm.js + node-pty (real PTY sessions)
- Light AI ops (auto-link, review, summarize) use default provider's headless mode (`claude -p`)
- Tasks can be assigned to AI agents — agent runs Claude Code, updates task, links artifacts
- Agent Dashboard for monitoring active/completed agent sessions
- **Scheduled agent jobs (cron)** — YAML-defined jobs, `claude -p` headless, run history, notifications
- Notifications: Telegram (Phase 2), Slack/Email/Webhook (Phase 3)
- Jobs stored as YAML in `/data/.jobs/`, history as log files
- Git-backed file tree for version history
- Kanban + tasks-by-date view
- Full-text search + semantic search fallback
- Export: copy MD, download MD, download PDF, export to Google Drive
- Real-time collaboration deferred unless easy to add

**Why:** Admin panel for founder + partner to manage knowledge, tasks, and agent-driven work. AI agents do the heavy lifting.
**How to apply:** Prioritize AI integration in every feature. Keep file-based storage. VPS-deployable.
