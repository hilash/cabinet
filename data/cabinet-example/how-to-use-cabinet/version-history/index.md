---
title: "Version History"
created: 2026-04-06T00:00:00.000Z
modified: 2026-04-06T18:10:00.000Z
tags:
  - example
  - guide
  - git
order: 4
---

# Version History

Every page in Cabinet is backed by Git. Every save creates a commit. Every commit is browsable. Every version is restorable. You never have to worry about losing work — the history goes back to the very first edit, and nothing is ever truly deleted.

This is especially important when working with the AI editor. If Claude makes an edit you don't like, or accidentally changes more than you intended, you can restore the previous version in seconds. No damage is permanent. It's like having a Time-Turner for your documents, except this one doesn't require Ministry approval.

## How Auto-Save Works

1. You edit a page in the editor
2. After 500ms of inactivity, Cabinet saves the file to disk
3. The save triggers a Git commit with an auto-generated message
4. The commit is stored in the local repository

This happens silently in the background. You never need to manually save or commit — just write, and Cabinet handles the rest.

## Opening Version History

To view the history of any page:

1. Open the page you want to inspect
2. Click the **clock icon** in the editor toolbar
3. The Version History panel opens, showing a list of commits

Each entry in the list shows:
- **Timestamp** — When the change was made
- **Commit message** — Usually auto-generated, describing what changed
- **Author** — Who (or what) made the edit

## The Diff Viewer

Click any commit to see a **diff view** — a side-by-side comparison showing exactly what changed:

- **Green lines** — Content that was added
- **Red lines** — Content that was removed
- **Gray lines** — Unchanged context around the edit

The diff viewer uses the same format as GitHub pull requests, so it'll feel familiar if you've done code review before. It's the fastest way to understand what happened to a page and when.

## Restoring a Previous Version

If you need to roll back a page:

1. Open Version History (clock icon)
2. Browse the commit list to find the version you want
3. Click **Restore** on that commit
4. The page content reverts to that point in time
5. A new commit is created recording the restoration

The restore itself is a new commit, so you never lose the in-between history. You can even restore a restore if you change your mind. It's versions all the way down.

## When to Use Version History

- **After an AI edit goes wrong** — Claude made changes you didn't want? Restore the previous version
- **Accidental deletions** — Cleared a section by mistake? It's still in history
- **Comparing changes over time** — Want to see how a page evolved? Browse the commit list
- **Auditing edits** — Need to know who changed what and when? Every commit has a timestamp and author

## Try It

Edit [[Joke Book]] — add a line, delete a paragraph, change a heading. Then click the clock icon in the toolbar to open Version History. You'll see your changes in the diff viewer, and you can restore the original with one click.

---

Back to [[How to Use Cabinet]]
