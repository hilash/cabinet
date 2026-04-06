---
title: "AI Editor Guide"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - ai
order: 2
---

# AI Editor Guide

Cabinet has a built-in AI assistant powered by Claude that can read and edit your pages directly. It's not a chatbot that spits out text for you to copy-paste — it actually modifies files on disk, making targeted edits exactly where they're needed. Think of it as a very careful scribe who reads the whole page before touching a single line.

## Opening the AI Panel

The AI panel lives on the right side of the screen. Open it with:

- **Cmd+Shift+A** — Toggle the AI panel
- **Click the AI icon** in the header toolbar

The panel slides open and you can chat with Claude while keeping your page visible on the left. You can resize the panel by dragging its edge.

## How AI Editing Works

When you ask Claude to edit a page, here's what happens behind the scenes:

1. **Claude reads the current file** — It sees the full markdown content, not just what's on screen
2. **Claude makes targeted edits** — It modifies only the specific parts you asked about
3. **The page refreshes** — You see the updated content in the editor immediately
4. **Git auto-commits** — The change is saved to version history

This is important: **Claude never replaces the entire page.** If you say "add a section about shipping," it will insert that section without touching your existing content. If something does go wrong, you can always restore from [[Version History]].

## @Mentions for Context

The real power move is `@mentions`. Type `@` in the AI chat to attach other pages as context:

- `@Sales` — Gives Claude the full content of the Sales page
- `@Marketing` — Attaches the Marketing page
- `@Product Catalog` — You get the idea

This means you can say things like "Summarize @Sales and update this page with the key metrics" and Claude will read both pages before making edits. It's like giving your assistant access to the filing cabinet (pun intended) instead of making them work from memory.

## Example Prompts

Here are some prompts that work well with Cabinet's AI editor:

| Prompt | What It Does |
|--------|-------------|
| "Add a section about Q2 goals at the end" | Inserts a new section without touching existing content |
| "Fix the typos in the ingredients list" | Reads the page, finds errors, corrects them in place |
| "Rewrite the intro to be more concise" | Replaces just the introduction paragraph |
| "Based on @Sales, add a revenue summary table" | Reads the Sales page, then creates a table on the current page |
| "Move the 'Shipping' section above 'Returns'" | Reorganizes content within the page |

## Tips for Good Prompts

- **Be specific about location** — "Add X after the pricing section" works better than "Add X somewhere"
- **Reference existing content** — "Update the table in the ingredients section" tells Claude exactly where to look
- **Use @mentions liberally** — The more context Claude has, the better the edits. Mischief managed, as they say
- **One task per message** — Complex multi-part edits work better as separate requests

## What the AI Panel Shows

After an edit, the AI panel displays a summary of what changed — not the entire file content. This keeps the chat clean and focused. If you want to see the exact diff, check [[Version History]].

## Try It

Open the AI panel with `Cmd+Shift+A` and try asking: "Summarize [[Marketing]] based on [[Sales]] data." Watch how Claude reads both pages and produces a targeted edit. If you don't like the result, `Cmd+Z` or restore from version history — no harm done.

---

Back to [[How to Use Cabinet]]
