# KB Structure — Cabinet

You are an AI agent working inside the Cabinet knowledge base. This file teaches you about the KB structure and conventions.

## Directory Layout

- All content lives in `/data/` (this directory)
- Each page is a **directory** containing an `index.md` and optional assets (images, files)
- Leaf pages can be a single `.md` file (no directory needed if no assets)
- Hidden directories (`.git`, `.jobs`, `.history`) are system directories — don't modify them
- Tasks are stored in `/data/tasks/board.yaml`
- Scheduled jobs are YAML files in `/data/.jobs/`

## Page Format

Every markdown file uses YAML frontmatter:

```yaml
---
title: Page Title
created: 2026-03-21T00:00:00Z
modified: 2026-03-21T00:00:00Z
tags: [tag1, tag2]
order: 1
---
```

- `title` — display name in the sidebar tree
- `order` — sort order within parent directory (lower = higher)
- `tags` — for search filtering
- `created` / `modified` — ISO timestamps

## Conventions

- Use `[[Page Name]]` for internal wiki-links between pages
- Assets (images, PDFs) go next to their markdown file in the same directory
- Use relative paths for assets: `![alt](./image.png)`
- When creating new content, always add frontmatter with title, tags, and created date
- Use markdown tables for structured data (they render properly in the UI)
- Keep page titles concise and descriptive

## Supported File Types

Cabinet renders the following file types as first-class views in the sidebar:

| Type | Extensions / trigger | Rendered as |
|------|---------------------|-------------|
| Markdown | `*.md` | WYSIWYG editor |
| CSV | `*.csv` | Interactive table editor |
| PDF | `*.pdf` | Inline PDF viewer |
| Mermaid | `*.mermaid`, `*.mmd` | Rendered diagram |
| Image | `.png .jpg .jpeg .gif .webp .svg .avif .ico` | Inline image viewer |
| Video | `.mp4 .webm .mov .m4v` | Inline video player |
| Audio | `.mp3 .wav .ogg .m4a .aac` | Inline audio player |
| Code | `.js .ts .py .go .swift .yaml .json` + many more | Syntax-highlighted viewer |
| Embedded website | Directory with `index.html`, no `index.md` | Iframe (sidebar visible) |
| Full-screen app | Directory with `index.html` + `.app` marker | Full-screen iframe |
| Linked repo | Directory with `.repo.yaml` | Normal page, repo context for agents |
| Office / archive | `.docx .pptx .xlsx .zip .fig .sketch` + more | Shown in sidebar, opens in Finder |

Any file not in the above sets is silently skipped (not shown in the sidebar).

## Embedded Apps (`.app` marker)

Any directory under `/data/` that contains an `index.html` **and no `index.md`** is rendered as an embedded website in an iframe.

To make it a **full-screen app** (sidebar + AI panel auto-collapse on click):

1. Place a `.app` marker file in the directory (empty file, no content needed)
2. The directory appears in the sidebar like any other page
3. Clicking it collapses sidebar + AI panel and loads the app full-screen
4. A "Back to KB" button in the toolbar restores the normal layout

```
/data/
  gpu-emulator/
    index.html     ← the app
    .app           ← marker: full-screen mode
    other-files/   ← any supporting files
```

Without `.app`, the directory renders as a regular embedded website with the sidebar visible.

## Linked Directories and Symlinks

External folders are linked into the KB as **direct symlinks**. When a user runs "Load Knowledge", Cabinet creates:

```
data/my-project -> /Users/me/Projects/my-project   (symlink)
```

The symlinked folder's contents appear as direct children in the tree — no wrapper directory.

Cabinet writes two hidden dotfiles into the **target directory**:

### `.cabinet-meta` (all linked dirs)
Display metadata for the KB. Hidden from the sidebar by `isHiddenEntry`.

```yaml
title: My Project
tags:
  - knowledge
created: '2026-04-11T00:00:00.000Z'
```

### `.repo.yaml` (git repos only)
Links the directory to a Git repository. Tells agents where to find the codebase.

```yaml
name: gpu-emulator
local: /path/to/local/clone
remote: https://github.com/org/repo
source: both
branch: main
description: GPU Visual Emulator — interactive GPU architecture visualization
```

**Fields:**
- `name` — Human-readable project name
- `local` — Absolute path to local clone on disk. Agents can read/search files here.
- `remote` — GitHub repo URL. Agents can link to it, fetch issues, PRs, etc.
- `source` — Where to look for code: `local`, `remote`, or `both`
- `branch` — Default branch name (for linking and agent context)
- `description` — What this repo contains (helps agents understand context)

**Usage by agents:**
When an agent is working on a KB page that has a `.repo.yaml` in the same directory or any parent directory, it should:
1. Read the `.repo.yaml` to discover the linked repo
2. Use the `local` path to read source code, search for implementations, understand architecture
3. Use the `remote` URL when creating links, referencing issues, or suggesting PRs
4. Include the repo context when answering questions about the related KB content

**Example structure:**
```
/data/
  my-project -> /external/path    ← direct symlink (has .cabinet-meta + .repo.yaml inside)
  gpu-emulator/
    index.html          ← the app
    .app                ← full-screen mode
    .repo.yaml          ← links to source repo
  product/
    .repo.yaml          ← links to the main cabinet repo itself
```

## Directory Examples

```
/data/
  getting-started/
    index.md              ← page with assets directory
  product/
    index.md              ← "Product" parent page
    roadmap/
      index.md            ← "Roadmap" sub-page
  market/
    competitors/
      index.md            ← competitors overview
      standard-kernel/
        index.md          ← individual competitor page
  people/
    index.md              ← CRM hub with master contacts table
    team/
      index.md            ← founding team
  research/
    gpu-hardware/
      nvidia-h100/
        index.md          ← GPU specs reference
  gpu-emulator/
    index.html            ← embedded app (no index.md)
    .app                  ← full-screen marker
    .repo.yaml            ← linked to source repo
  tasks/
    board.yaml            ← kanban board data
```

## When Creating Pages

1. Create a directory with a slugified name (lowercase, hyphens)
2. Add `index.md` with proper frontmatter
3. Place any assets in the same directory
4. If the page belongs under a parent, create it as a subdirectory

## When Editing Pages

1. Read the current content first
2. Preserve existing frontmatter fields
3. Update the `modified` timestamp
4. Don't remove existing content unless explicitly asked
