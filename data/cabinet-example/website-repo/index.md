---
title: Website Repo
created: '2026-04-06T00:00:00.000Z'
modified: '2026-04-06T18:10:00.000Z'
tags:
  - example
  - repo
order: 7
---
# Website Repo

This folder demonstrates the linked-repo pattern for the Weasleys' storefront.

There is a hidden `.repo.yaml` file in this directory, which is what gives this folder the repo badge in the sidebar.

In this example, the linked local path points to the sample `source/` folder inside this KB. In a real workspace, you would swap that path for your actual local clone and then let agents work against the real thing.

## Setup In 90 Seconds

1. Open `source/`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Confirm the homepage renders a dramatic hero, magical product cards, and at least one color George would describe as "commercially irresponsible."

## If The Magic Gods Are Testing You

- If `next` is missing, you probably skipped `npm install`.
- If port 3000 is busy, another app claimed the stage first.
- If JavaScript behaves strangely, that does not automatically make it cursed, but keep an open mind.
- If you want AI help, point an agent at this repo section and ask for a concrete patch.

## Why This Is Useful

- Planning docs can live next to code context.
- Agents can read repo metadata and the linked source path.
- You can explain the setup once instead of repeating it in owl post until morale fails.
