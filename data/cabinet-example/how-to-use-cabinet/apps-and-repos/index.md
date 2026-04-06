---
title: "Apps and Repos"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - apps
order: 5
---

# Apps and Repos

Cabinet goes beyond markdown pages. You can embed full web applications, link external Git repositories, and create interactive tools that live right alongside your documentation. The sidebar becomes a launchpad for everything your team uses — no context switching required.

## Embedded Apps

Any directory that contains an `index.html` file (and no `index.md`) is treated as an embedded app. Cabinet renders it in an iframe, so it behaves like a standalone web page nested inside your workspace.

There are two modes:

### Standard Embedded Apps
The app renders in the main content area with the sidebar and AI panel still visible. Good for reference tools and dashboards you want to glance at while working on other pages.

**Example:** [[Shop Floor Map]] is a standard embedded app — you can see the shop layout while the sidebar stays open for navigation.

### Full-Screen Apps (.app marker)
Add a `.app` marker file to the directory, and the app goes full-screen: the sidebar and AI panel auto-collapse to give the app maximum space. Perfect for complex tools that need the whole viewport.

**Examples in this workspace:**
- [[candy-counter]] — Inventory tracking dashboard (full-screen)
- [[owl-post-crm]] — Customer relationship management tool (full-screen)
- [[prank-lab]] — Product testing and experimentation tracker (full-screen)

## Sidebar Icons

The sidebar uses color-coded icons to help you identify different content types at a glance:

| Icon | Color | Meaning |
|------|-------|---------|
| AppWindow | Green | Full-screen embedded app (has `.app` marker) |
| Globe | Blue | Standard embedded app (iframe with sidebar) |
| GitBranch | Orange | Linked Git repository |
| File | Default | Regular markdown page |
| Folder | Default | Directory with sub-pages |

## Linked Repositories

A `.repo.yaml` file in any data directory links it to a Git repository. This is powerful for teams that want their code and documentation side by side:

```yaml
path: /path/to/local/repo
remote: https://github.com/org/repo.git
```

When a directory has a `.repo.yaml`, Cabinet knows it's connected to a codebase. Agents can use this to read and search source code in context when working on related documentation. It's like giving the AI a map to the actual code, not just the docs about the code.

**Example:** [[Storefront]] demonstrates the linked repo pattern — connecting shop documentation to its codebase.

## Symlinks

Cabinet supports symbolic links for cases where you want the same content to appear in multiple places:

- **Right-click** a folder in the sidebar
- Select **"Add Symlink"** from the context menu
- Choose the target directory

Symlinks are standard filesystem symlinks, so they work with all of Cabinet's features — editing, search, version history, the lot.

## Creating Your Own App

To add an embedded app to your workspace:

1. Create a new directory under your data folder
2. Add an `index.html` file with your app's markup, CSS, and JavaScript
3. (Optional) Add a `.app` marker file for full-screen mode
4. The app appears in the sidebar automatically

No build step, no deployment pipeline. Just HTML in a folder. It's the simplest hosting platform you'll ever use — even Mundungus Fletcher could set it up.

## Try It

Click on [[candy-counter]], [[owl-post-crm]], or [[prank-lab]] in the sidebar to see full-screen apps in action. Notice how the sidebar collapses to give them room. Then visit [[Shop Floor Map]] to see a standard embedded app that keeps the sidebar visible.

---

Back to [[How to Use Cabinet]]
