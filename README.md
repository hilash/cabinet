# Cabinet

**The AI-first knowledge base and startup OS.**

Cabinet is a self-hosted platform where you onboard an AI team that works for you. Each agent has a role, recurring jobs, and a workspace in the knowledge base. You watch them work like watching a real team.

## Quick Start

```bash
npx paperclipai@latest init
cd cabinet
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000).

## Manual Install

```bash
git clone https://github.com/hilash/cabinet.git
cd cabinet
npm install
cp .env.example .env.local
npm run dev:all
```

## What You Get

- **WYSIWYG Editor** — Rich text editing with markdown, tables, code blocks
- **AI Agents** — 20 pre-built agent templates (CEO, CTO, Content Marketer, etc.)
- **Agent Sessions** — Live Claude Code terminals for each agent
- **Scheduled Jobs** — Cron-based automation with human-readable schedule picker
- **Knowledge Base** — File-based, git-backed, version history with restore
- **Web Terminal** — Full Claude Code terminal in the browser
- **Search** — Cmd+K full-text search across all pages
- **Embedded Apps** — Drop an `index.html` in any directory
- **PDF & CSV Viewers** — First-class support for PDFs and spreadsheets
- **Dark/Light Mode** — Theme toggle

## Architecture

```
cabinet/
  src/
    app/api/         → Next.js API routes
    components/      → React components (sidebar, editor, agents, etc.)
    stores/          → Zustand state management
    lib/             → Storage, markdown, git, agents
  server/
    cabinet-daemon.ts → WebSocket + job scheduler + agent executor
  data/
    .agents/.library/ → 20 pre-built agent templates
    getting-started/  → Default KB page
```

**Tech stack:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Tiptap, Zustand, SQLite, xterm.js

## Requirements

- **Node.js** 20+
- **Claude Code CLI** installed (`npm install -g @anthropic-ai/claude-code`)
- macOS or Linux (Windows via WSL)

## Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `KB_PASSWORD` | _(empty)_ | Password to protect the UI. Leave empty for no auth. |
| `DOMAIN` | `localhost` | Domain for the app |

## Commands

```bash
npm run dev          # Next.js dev server (port 3000)
npm run dev:daemon   # Terminal + job scheduler (port 3001)
npm run dev:all      # Both servers
npm run build        # Production build
npm run start        # Production mode (both servers)
```

## Agent Library (20 templates)

| Department | Agents |
|---|---|
| **Leadership** | CEO, COO, CFO, CTO |
| **Product** | Product Manager, UX Designer |
| **Marketing** | Content Marketer, SEO Specialist, Social Media, Growth Marketer, Copywriter |
| **Engineering** | Editor, QA Agent, DevOps Engineer |
| **Sales & Support** | Sales Agent, Customer Success |
| **Analytics** | Data Analyst |
| **Operations** | People Ops, Legal Advisor, Researcher |

## License

MIT
