---
title: Apps and Repos
created: '2026-04-12T00:00:00.000Z'
modified: '2026-04-12T00:00:00.000Z'
tags:
  - guide
  - apps
  - repos
order: 1
---

# Apps and Repos

Cabinet goes beyond markdown pages. You can embed full web applications, link external Git repositories, and create interactive tools that live right alongside your documentation.

## Embedded Apps

Any directory that contains an `index.html` file **and no `index.md`** is treated as an embedded app. Cabinet renders it in an iframe.

### Standard Embedded App

The app renders in the main content area with the sidebar and AI panel still visible. Good for dashboards and reference tools you want to glance at while working.

```
data/
  my-dashboard/
    index.html     ← the app (renders as iframe with sidebar)
    app.js
    style.css
```

### Full-Screen App (`.app` marker)

Add an empty `.app` marker file to the directory and the app gets maximum space: the sidebar and AI panel auto-collapse on open. A **Back to KB** button in the toolbar restores the normal layout.

```
data/
  my-tool/
    index.html     ← the app
    .app           ← marker: full-screen mode
    other-files/
```

Both types appear in the sidebar automatically — no build step, no deployment.

## Linked Repositories

A `.repo.yaml` file in any data directory links it to a Git repository. Agents use this to read and search source code in context when working on related documentation.

```yaml
name: my-project
local: /path/to/local/repo
remote: https://github.com/org/repo.git
source: both
branch: main
description: What this repo contains (helps agents understand context)
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable project name |
| `local` | Yes | Absolute path to local clone |
| `remote` | No | GitHub URL — used for links, issues, PR suggestions |
| `source` | No | `local`, `remote`, or `both` (default: `both`) |
| `branch` | No | Default branch (default: `main`) |
| `description` | No | Free-text description for agent context |

When an agent works on a KB page that has a `.repo.yaml` in the same directory or any parent, it will:
1. Read the `.repo.yaml` to find the linked repo
2. Use `local` path to read source code and understand architecture
3. Use `remote` URL when creating links or suggesting PRs

The sidebar shows these directories with an orange **GitBranch** icon.

## Sidebar Icon Reference

| Icon | Color | Trigger |
|------|-------|---------|
| AppWindow | Green | Directory has `index.html` + `.app` (no `index.md`) |
| Globe | Blue | Directory has `index.html`, no `.app`, no `index.md` |
| GitBranch | Orange | Directory has `.repo.yaml` |
| Link2 | Blue | Symlinked directory without `.repo.yaml` |

---

Back to [[Getting Started]]
