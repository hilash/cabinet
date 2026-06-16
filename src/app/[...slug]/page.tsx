"use client";

import { AppShell } from "@/components/layout/app-shell";

/**
 * Catch-all that renders the SPA shell for any non-API, non-explicit path so
 * clean URLs like `/room/<path>` survive a refresh / deep link (PRD §11).
 * `src/app/page.tsx` handles `/`; explicit routes (api, login, tasks, …) take
 * precedence over this catch-all. A non-optional `[...slug]` is used (not
 * `[[...slug]]`) so it doesn't collide with `page.tsx` at the root.
 */
export default function CatchAll() {
  return <AppShell />;
}
