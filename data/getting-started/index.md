---
title: Getting Started
created: '2026-03-21T00:00:00.000Z'
modified: '2026-04-06T19:40:16.548Z'
tags:
  - guide
  - onboarding
order: 1
---
# Welcome to Cabinet

The AI-first knowledge base and startup OS — shared memory between humans and AI agents.

No, we're not gonna spam your tokens. Built by team of ex-Apple engineers with security background, we want to Help you Execute at MAX level, without fluff and clean install.

We have 2 parts:

-   Knowledge Base - the brain. AI agents without memory of your projects are useless. Our point is that everything should be in the KB. you can put HTML apps, MD, pdfs - any files and apps you need for your website. Admin panel, iframes,.. the Knowledge Base is alive, kicking and your one stop shop!
    
-   World Class AI agents - you can time jobs, heartbeats. you have catalog of B2B and B2C plays and recommendation and well safe plays out of the box
    

## What's Here

<table class="border-collapse w-full" style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Section</p></th><th colspan="1" rowspan="1"><p>What It Contains</p></th></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:product">Product</a></p></td><td colspan="1" rowspan="1"><p>Product formulation, roadmap, and archive of earlier drafts</p></td></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:market">Market</a></p></td><td colspan="1" rowspan="1"><p>Competitors, market landscape, and target segments</p></td></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:people">People</a></p></td><td colspan="1" rowspan="1"><p>CRM — team, advisors, investors, industry contacts, customers</p></td></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:research">Research</a></p></td><td colspan="1" rowspan="1"><p>GPU hardware specs, technical deep dives, validation work</p></td></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:presentations">Presentations</a></p></td><td colspan="1" rowspan="1"><p>Pitch decks and presentation materials</p></td></tr><tr><td colspan="1" rowspan="1"><p><a target="_blank" rel="noopener noreferrer nofollow" class="wiki-link" href="#page:operations">Operations</a></p></td><td colspan="1" rowspan="1"><p>Fundraising, legal, hiring (as needed)</p></td></tr></tbody></table>

## Features

-   **WYSIWYG Editor** — Rich text editing with formatting toolbar, tables, code blocks, and markdown source toggle
    
-   **Wiki-Links** — Type `<a data-wiki-link="true" data-page-name="Page Name" href="#page:page-name" class="wiki-link">Page Name</a>` to link between pages. Links render as styled clickable elements.
    
-   **Slash Commands** — Type `/` for quick formatting options
    
-   **AI Editor** — Right-side panel where Claude edits pages directly. Use `@PageName` to attach context
    
-   **Kanban Tasks** — Board and list views with Backlog, In Progress, Review, Done columns
    
-   **Agent Dashboard** — Run AI agents on tasks, monitor sessions
    
-   **Web Terminal** — Full Claude Code terminal in the browser (xterm.js + node-pty)
    
-   **Scheduled Jobs** — Cron-based automation with YAML configs
    
-   **Search** — `Cmd+K` full-text search across all pages
    
-   **Version History** — Git-backed auto-save with diff viewer and restore
    
-   **Drag & Drop** — Reorder pages in the sidebar, upload images by pasting/dragging
    
-   **Export** — Copy as MD/HTML, download .md, or print to PDF
    
-   **Dark/Light Mode** — Theme toggle with Inter + JetBrains Mono fonts
    
-   **PDF Viewer** — PDF files appear in the sidebar and open inline with the browser's native PDF renderer
    
-   **CSV Viewer/Editor** — CSV files render as interactive tables. Double-click cells to edit, add/delete rows and columns, toggle source view, and save with auto-commit
    
-   **Embedded Apps** — Directories with `index.html` render as embedded websites. Add a `.app` marker for full-screen mode (sidebar auto-collapses)
    
-   **Linked Repos** — Add `.repo.yaml` to link a KB directory to a Git repo. AI agents use this to read source code in context
    

## Import Your Repos

You can import your existing repos into Cabinet.

Open the Knowledge Base menu in the left sidebar and choose `Add Symlink`. Cabinet will:

-   create a KB folder for the repo
    
-   add a `source` symlink that points to your local repo
    
-   create a `.repo.yaml` file so agents understand the repo context
    

If the linked repo has an `index.html`, Cabinet will show that folder as an embedded website inside the Knowledge Base.

## Sidebar Icons

<table class="border-collapse w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Icon</p></th><th colspan="1" rowspan="1"><p>Color</p></th><th colspan="1" rowspan="1"><p>Meaning</p></th></tr><tr><td colspan="1" rowspan="1"><p>AppWindow</p></td><td colspan="1" rowspan="1"><p>Green</p></td><td colspan="1" rowspan="1"><p>Full-screen embedded app (<code>.app</code> marker)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Globe</p></td><td colspan="1" rowspan="1"><p>Blue</p></td><td colspan="1" rowspan="1"><p>Embedded website (<code>index.html</code>)</p></td></tr><tr><td colspan="1" rowspan="1"><p>GitBranch</p></td><td colspan="1" rowspan="1"><p>Orange</p></td><td colspan="1" rowspan="1"><p>Directory linked to a Git repo (<code>.repo.yaml</code>)</p></td></tr><tr><td colspan="1" rowspan="1"><p>FileType</p></td><td colspan="1" rowspan="1"><p>Red</p></td><td colspan="1" rowspan="1"><p>PDF file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Table</p></td><td colspan="1" rowspan="1"><p>Green</p></td><td colspan="1" rowspan="1"><p>CSV file</p></td></tr><tr><td colspan="1" rowspan="1"><p>Folder</p></td><td colspan="1" rowspan="1"><p>Gray</p></td><td colspan="1" rowspan="1"><p>Regular directory</p></td></tr><tr><td colspan="1" rowspan="1"><p>FileText</p></td><td colspan="1" rowspan="1"><p>Gray</p></td><td colspan="1" rowspan="1"><p>Markdown page</p></td></tr></tbody></table>

## Keyboard Shortcuts

<table class="border-collapse w-full" style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Shortcut</p></th><th colspan="1" rowspan="1"><p>Action</p></th></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+S</code></p></td><td colspan="1" rowspan="1"><p>Force save</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+K</code></p></td><td colspan="1" rowspan="1"><p>Search</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+``</code></p></td><td colspan="1" rowspan="1"><p>Toggle terminal</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>Cmd+Shift+A</code></p></td><td colspan="1" rowspan="1"><p>Toggle AI panel</p></td></tr></tbody></table>

---

# How to Use Cabinet

Cabinet is an AI-first knowledge base where everything lives as files on disk. There's no database, no cloud lock-in, and no mystery about where your data goes. You write pages in markdown, organize them in a tree, and let AI agents help you edit and maintain the whole thing.

This guide section walks through every major feature. If you're new here, start from the top and work your way down. If you already know what you're looking for, jump straight to the relevant page.

## What Cabinet Can Do

-   **Rich text editing** with a WYSIWYG editor that feels like a proper writing tool, not a code editor with delusions of grandeur
    
-   **AI-powered editing** via Claude, which reads your pages and makes targeted changes on command
    
-   **Full-text search** across every page in the knowledge base (Cmd+K)
    
-   **Wiki-links** between pages using `<a data-wiki-link="true" data-page-name="Page Name" href="#page:page-name" class="wiki-link">Page Name</a>` syntax
    
-   **Git-backed version history** so every edit is recoverable
    
-   **Embedded web apps** that run inside the sidebar as iframes or full-screen tools
    
-   **Linked repositories** that connect KB sections to real Git repos
    
-   **Kanban task boards** for tracking work
    
-   **Scheduled jobs** for automated recurring tasks
    
-   **A web terminal** for running Claude Code directly in the browser
    

## The Guides

Each sub-page covers a specific feature area in detail:

1.  [Editor Tips](#page:editor-tips) — The WYSIWYG editor, slash commands, markdown toggle, and tables
    
2.  [AI Editor Guide](#page:ai-editor-guide) — The AI panel, @mentions, example prompts, and how Claude edits pages
    
3.  [Search and Navigation](#page:search-and-navigation) — Cmd+K search, wiki-links, sidebar tree, and image uploads
    
4.  [Version History](#page:version-history) — Git auto-save, the diff viewer, and restoring previous versions
    
5.  [Apps and Repos](#page:apps-and-repos) — Embedded apps, full-screen mode, linked repos, and symlinks
    
6.  [Tasks and Jobs](#page:tasks-and-jobs) — Kanban boards, agent sessions, the web terminal, and scheduled jobs
    

## A Note on This Example Workspace

This knowledge base is themed around Fred and George Weasley's joke shop. The pages, data, and apps are all built to feel like a real internal workspace for a (magical) retail business. The examples in these guides reference actual pages in this workspace, so you can follow along and try things out.

As George would say: "The best way to learn a tool is to use it on something that might explode."

---

Last Updated: 2026-04-06
