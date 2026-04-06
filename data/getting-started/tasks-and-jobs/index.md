---
title: "Tasks and Jobs"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - tasks
order: 6
---

# Tasks and Jobs

Cabinet includes built-in project management and automation tools. The Kanban board tracks work across your team, the Agent Dashboard runs AI-powered tasks, the Web Terminal gives you a command line in the browser, and Scheduled Jobs automate recurring work on a cron schedule.

## Kanban Board

Switch to the **Tasks** view (via the header tabs) to see a Kanban board with four columns:

- **Backlog** — Work that's been identified but not started
- **In Progress** — Actively being worked on
- **Review** — Done but needs verification
- **Done** — Completed and verified

Tasks are stored in `tasks/board.yaml` on disk — no external database, no SaaS subscription. You can edit the YAML directly if you prefer, or use the board UI to drag cards between columns.

Each task card shows:
- Title and description
- Priority level
- Assignee
- Tags for categorization

Drag cards between columns to update their status. It's as straightforward as moving parchment between piles on a desk — though considerably less likely to be set on fire by an errant Wildfire Whiz-Bang.

## Agent Dashboard

The **Agents** tab opens the Agent Dashboard, where you can run AI-powered agents that perform multi-step tasks:

- Agents use Claude Code under the hood
- Each agent session has its own context and can read/edit pages
- You can monitor active sessions and review their output
- Agents can be pointed at linked repos to work with source code

This is where the AI goes beyond single edits and into autonomous workflows — researching, planning, and executing across multiple pages.

## Web Terminal

Press **Cmd+`** (backtick) to open the Web Terminal — a full terminal emulator running in your browser via WebSocket:

- Runs a real PTY session on the server
- Supports Claude Code CLI directly in the browser
- Full color and interactive command support
- Useful for quick operations without switching to a separate terminal app

The terminal server runs on port 3001 (started with `npm run dev:terminal` or `npm run dev:all`).

## Scheduled Jobs

Cabinet can run automated tasks on a schedule using cron syntax. Jobs are defined as YAML files in the `.jobs/` directory:

```yaml
name: Morning Owl Briefing
schedule: "0 9 * * *"
command: "Summarize overnight sales and flag any issues"
```

### Example Jobs in This Workspace

This joke shop workspace comes with three pre-configured jobs:

| Job | Schedule | What It Does |
|-----|----------|--------------|
| **Morning Owl Briefing** | Daily at 9:00 AM | Summarizes overnight activity, flags anything that needs attention — like a Daily Prophet for your shop, but with fewer editorials |
| **Weekly Prank Safety Review** | Monday at 10:00 AM | Reviews prank product safety logs and compliance notes for the week |
| **Inventory Stock Alert** | Every 6 hours | Checks inventory levels and alerts if any products are running low — because running out of Puking Pastilles mid-rush is no joke (well, it is, but not a good one) |

Jobs run via `node-cron` on the server. Each execution is logged, and you can view results in the Jobs manager UI.

## How It All Fits Together

The real power is in combining these tools:

1. A **Scheduled Job** detects low inventory at 6 AM
2. It creates a **Task** card in the Backlog column
3. An **Agent** picks it up and drafts a reorder request
4. You review it in the **Kanban board** and move it to Done

All without leaving Cabinet. All backed by files on disk. All versioned in Git.

## Try It

Switch to the **Tasks** view in the header to see the current Kanban board. Browse the cards, drag one to a different column, and watch the YAML update on disk. Then check the **Jobs** tab to see the three scheduled jobs configured for this workspace.

---

Back to [[How to Use Cabinet]]
