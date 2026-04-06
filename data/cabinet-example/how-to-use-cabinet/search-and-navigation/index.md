---
title: "Search and Navigation"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - search
order: 3
---

# Search and Navigation

A knowledge base is only useful if you can find things in it. Cabinet gives you several ways to navigate your workspace — from quick full-text search to wiki-links that connect pages like a web of related ideas.

## Cmd+K Search

Press **Cmd+K** (or **Ctrl+K** on Linux) to open the search dialog. This is the fastest way to find anything:

- **Full-text search** — Searches page titles and content across your entire workspace
- **Instant results** — Results appear as you type, no need to press Enter
- **Keyboard navigation** — Use arrow keys to move through results, Enter to open
- **Fuzzy matching** — Close-enough spelling still finds what you're looking for

The search indexes everything under your data directory, including page content, titles, and frontmatter tags. It's fast even with hundreds of pages — no external search server required, no Floo Powder needed.

## Wiki-Links

Wiki-links are the connective tissue of your knowledge base. Use double brackets to link to any page:

```
[[Page Name]]
```

For example, `[[Product Catalog]]` creates a clickable link to the Product Catalog page. Wiki-links work by matching the page title (from frontmatter), so you don't need to remember file paths.

Some things to know about wiki-links:

- **Case-sensitive** — `[[Sales]]` and `[[sales]]` are different
- **Title-based** — They match the `title` field in frontmatter, not the filename
- **Click to navigate** — In the editor, clicking a wiki-link opens that page
- **AI-aware** — When you use `@PageName` in the AI panel, it works the same way

## Sidebar Tree

The left sidebar shows your entire workspace as a collapsible tree:

- **Click** a page to open it
- **Click the arrow** to expand/collapse directories
- **Drag and drop** pages to reorganize them — the `order` field in frontmatter updates automatically
- **Right-click** for a context menu with options like rename, delete, and create sub-page

The tree reflects the actual directory structure on disk. What you see is what you get — no hidden layers of indirection.

## Creating New Pages

Several ways to create a new page:

1. **New Page button** — Click the `+` button at the top of the sidebar
2. **Right-click menu** — Right-click a folder in the sidebar and select "New Page"
3. **Right-click menu** — Right-click a folder and select "New Folder" for a page with sub-pages

New pages start with basic frontmatter (title, created date) and an empty body. The file is created on disk immediately — no "draft" state, no publish step.

## Page Icons

Pages can have custom icons set via the `icon` field in frontmatter. These show up in the sidebar tree and make scanning the page list much faster. The shop workspace uses product emojis to keep things visually organized — a small touch that makes a big difference when you have dozens of pages.

## Image Upload

You can add images to any page by:

- **Paste** — Copy an image or take a screenshot, then `Cmd+V` in the editor
- **Drag and drop** — Drag image files from your file manager into the editor

Images are uploaded to the page's directory on disk, keeping assets co-located with the content that references them. No CDN configuration, no broken image links when you move things around.

## Try It

Press **Cmd+K** and search for "Moonbeam" — it finds [[Moonbeam Meltdrops]] instantly. Then try clicking a wiki-link in any page to jump between related content. The whole workspace is connected.

---

Back to [[How to Use Cabinet]]
