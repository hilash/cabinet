# PRD — Rooms (Workspaces) & the Home Switcher

**Status:** v3 shipped; 2026-06-13 review updates the ship criteria and remaining gaps (§10) and adds a clean-path routing migration (§11).
**Author:** hilash · **Last updated:** 2026-06-13
**Driver:** A home-button switcher next to the logo that moves you between *rooms* (office, study,
research, personal…), where each room is its own isolated workspace — and lets you open any room in
its own window.

> **This is now the single source of truth.** The former `docs/ROOMS_V3_TRUE_ISOLATION_PLAN.md`
> (the v3 implementation companion) has been merged into this document; the file at that path is
> kept only as a stub redirect.

> **Version history.**
> - **v1 (draft):** flatten into `data/<room>/` with a destructive migration and "nothing shared."
> - **v2 (draft):** *lighter* — keep `data/` as both the root cabinet *and* the parent of all rooms,
>   surface the existing per-cabinet isolation, **no migration**.
> - **v3 (shipped, this doc):** v2's "root is the default room" turned out to be the bug, not a
>   feature — the root cabinet was simultaneously a room *and* the physical parent of every other
>   room, so isolation could only be faked with a UI filter. v3 makes `data/` a neutral **home
>   container** and every room a true **sibling cabinet**, giving room scoping a structural filesystem
>   base. There *is* a migration, but it must remain safe and idempotent.

> **2026-06-13 — combined plan.** This doc now carries two sequenced workstreams. **Phase 1 (§10):**
> harden the rooms model so search, chat, and path-resolution **fail closed** to the active room.
> **Phase 2 (§11):** migrate the app off hash routing to clean `/room/...` URLs (mirroring the file
> tree) and free `#` for in-page section anchors. **Sequencing:** Phase 1 first — it builds the
> reopen/path-persistence layer (`lastActivePath`, §10.5) that Phase 2 reuses, so reopen logic lives
> in exactly one place. **Isolation stance:** rooms are a **product/UX boundary, not a security
> sandbox** — never surface another room's content unless the user explicitly opts in (§1, §2).

---

## 1. Summary

Cabinet's analogy is *your home*. v3 makes the file system match it literally: **`data/` is the home
container** (it holds your rooms but is not itself a working cabinet), and **each room is a
self-contained cabinet** at `data/<room>/` — its own pages, agents, tasks, jobs, chat, skills,
search index, and look.

Rooms are a **product / UX isolation boundary**, not a security sandbox in this version. By default,
Cabinet must never surface content from another room, but cross-room behavior can exist when the user
explicitly asks for it (for example, a "Search other rooms" checkbox).

You are always *inside a room*. The **home-button switcher** (the room's icon next to the `cabinet`
logo) lets you switch rooms, customize a room (name / icon / color / theme), add a room, or open a
room in its own window. Within a room, nested sub-cabinets still work exactly as before (roll-up
visibility own / +1 / +2 / all); across rooms there is no surfacing unless the user explicitly opts
into a cross-room affordance.

## 2. Goals & non-goals

**Goals / acceptance criteria**
- One click on the room icon → a switcher: current room, list, switch, customize, add, open-in-window.
- Each room is a top-level cabinet (own subtree + own room search index). No room parents another.
- Per-room **identity**: icon + accent color + theme, stored in the room's `.cabinet` manifest.
- **Theme** and **search** follow the active room. Theme applies on switch; search is scoped to the
  current room by default.
- Cross-room search is explicit: the user must enable "Search other rooms", and results must show
  which room they came from.
- A window's scope is a `cabinetPath`, so **open any room in its own window** works (Electron + web),
  each window keeping its own room and theme.
- A **safe, idempotent migration** for existing installs; **onboarding** creates rooms natively.
- Reopen behavior restores the last valid path when possible, then falls back to a valid room.

**Non-goals (this pass)**
- Security-grade tenant isolation. Rooms are UX/product boundaries in this version.
- Cross-room agent roll-up. Agents stay room-scoped unless explicitly promoted through a future
  shared-agent design.
- A full retire of the `"."`-as-root code path everywhere (see §8 — we kept a thin empty "home"
  cabinet instead, on purpose).
- A dedicated home/launcher *screen* (you land directly in the default room; the switcher is the home UX).
- Templated room-types onboarding picker beyond what already exists.

## 3. Decisions / target contract

| Question | Decision |
|---|---|
| What is a room? | A **top-level cabinet**: a direct child of `data/` with a `.cabinet` manifest (`kind: room`). Plain folders are **not** rooms (they are content inside a room). |
| What is `data/`? | The neutral **home container**. It carries a thin `.cabinet` (`kind: home`) marker + `data/.home/home.json`, but holds **no content/agents/tasks** of its own. |
| Isolation | **Product / UX isolation by default.** Each room is a separate subtree with its own room search index. The tree is rooted per room; search defaults to room-scoped; roll-up never crosses a room boundary (the home rolls up nothing). This is not yet a security sandbox. |
| Default / last room | `data/.home/home.json` stores `defaultRoom`, `lastActiveRoom`, and `lastActivePath`. The app opens the last valid path, then last valid room, then default room, then first valid room. |
| Home button | The room's **icon + color** next to the logo; the dropdown switches / customizes / adds / opens-in-window. The room name shows in the drawer + main header. |
| Per-room identity | `icon` + `color` + `theme` under `room:` in each cabinet's `.cabinet` manifest. New rooms get a distinct icon/color automatically. |
| Theme | Per-room. Applied on switch and on load via `RoomThemeSync`; falls back to the global theme when unset. Lives only in the DOM, so each window themes independently. |
| Search | One room search index per room. Queries search the active room by default. A visible "Search other rooms" checkbox enables cross-room results, and those results show their source room. Missing `cabinetPath` must fall back to a valid room, never to unlabelled global search. |
| Creation | **Add room** (switcher) → a new top-level isolated room (`kind: room` + auto icon/color). **New Cabinet** (sidebar) → a sub-cabinet *inside the current room* (`kind: child`). |
| Chat | Per-room, even if no full team-chat UI is currently exposed. Legacy/global chat storage must not be revived without threading `cabinetPath`. |
| `.global-agents` | Temporary technical debt. Keep default empty; do not build new product behavior on it without a replacement shared-agent design. |
| Multi-window | A window's scope is its URL hash (`#/cabinet/<room>`). Electron spawns a native `BrowserWindow` reusing the backend; web uses `window.open`. Each window keeps its own room + theme. |
| Delete room | Soft-delete by moving to `data/.trash/<slug>-<timestamp>/`. The dialog warns that running chats/jobs in the room will be stopped. Commit scoped dirty changes first, then commit the deletion. |
| Migration | **Yes, but safe** — idempotent + git-checkpointed (`scripts/migrate-rooms-v3.mjs`). Onboarding creates rooms natively, so new installs need no migration. |

---

## 4. The model

- **`data/` is a neutral container ("home"), not a working cabinet.** Marked with a thin
  `kind: home` manifest so `"."`-as-root code paths resolve to a valid but empty scope; carries no
  content, agents, or tasks of its own.
- **A room is a top-level cabinet: `data/<room>/`,** fully self-contained for product behavior —
  its own `.cabinet`, `index.md`, `.agents/`, `.jobs/`, `.cabinet-state/`, `.chat/`, and **its own
  search index**. No room is the parent of another.
- **Within a room,** nested sub-cabinets work exactly as today (roll-up visibility own / +1 / +2
  / all). **Across rooms: no surfacing by default.** Cross-room behavior requires an explicit UI
  affordance.
- **There is always an active room.** The first path segment of `section.cabinetPath` *is* the
  room (`work`, `work/projects/acme`). If the current path is missing or stale, the app falls back
  to the last valid path, then last valid room, then default room, then first valid room. The home
  itself surfaces no content.
- **One legacy cross-room thing remains:** `data/.global-agents/` (default empty). Treat it as
  technical debt, not a long-term product pillar.

### 4.1 Target on-disk layout

```
data/                         ← home container (NOT a working cabinet)
├── .cabinet                  ← thin kind:home marker (keeps "." a valid empty scope)
├── .home/home.json           ← { defaultRoom, lastActiveRoom, lastActivePath }
├── .agents/.config/          ← GLOBAL app config: user, providers, onboarding-complete, integrations
├── .global-agents/           ← legacy shared agents debt (default empty)
├── .cabinet-state/           ← machine/app state (ports, disclaimer-ack, file-schema)
├── .git/                     ← one repo for the whole home (history preserved across rooms)
├── work/                     ← a room: an isolated, self-contained cabinet
│   ├── .cabinet              ← kind:room + room:{icon,color,theme}
│   ├── .cabinet.db           ← this room's own search index (target)
│   ├── .agents/  .jobs/  .chat/  .cabinet-state/
│   ├── getting-started/  index.md  …content…
│   └── …nested sub-cabinets (kind:child) roll up within the room…
├── personal/                 ← another room, fully isolated from `work`
└── …more sibling rooms…
```

### 4.2 What changed vs. v2

| Concern | v2 (was) | v3 (shipped) |
|---|---|---|
| `data/` | the root cabinet **and** the container | container only (thin `kind:home` marker) |
| A room | top-level dir, *or the root* | top-level dir **with `.cabinet`** only |
| Folders without `.cabinet` | listed as rooms | **not** rooms (they're content of a room) |
| Isolation | UI filter + default "own" visibility | room-scoped product behavior backed by sibling subtrees |
| Search | one shared `data/.cabinet.db` | **one index per room**; explicit cross-room opt-in |
| Root room | special, parents everything | **gone**; all rooms are equal siblings |
| `section.cabinetPath` `"."` | the root cabinet | the home (empty scope); rooms start at a slug |

---

## 5. What lives where (authoritative classification)

The migration's move-list, derived from the real `data/` on 2026-05-23.

**Moves INTO the room** (`data/<rootSlug>/`) — these belonged to the old root cabinet:

| Item | Why | New location |
|---|---|---|
| `data/.cabinet` | the cabinet manifest | `data/<root>/.cabinet` |
| `data/.cabinet.db` (+ `-shm`, `-wal`) | the cabinet's search index | `data/<root>/.cabinet.db*` |
| `data/.agents/<persona>/` | the cabinet's team | `data/<root>/.agents/<persona>/` |
| `data/.agents/.conversations`, `.memory`, `.messages`, `.runtime` | per-cabinet agent runtime | `data/<root>/.agents/…` |
| `data/.agents/.config/company.json`, `workspace.json` | **per-room** workspace identity | `data/<root>/.agents/.config/` |
| `data/.chat/` | the room's team chat | `data/<root>/.chat/` |
| `data/index.md` | the cabinet entry page | `data/<root>/index.md` |
| `data/getting-started/`, `data/songs/`, etc. (no `.cabinet`) | the cabinet's **content** | `data/<root>/…` |
| any other plain top-level folder/file | the cabinet's content | `data/<root>/…` |

**STAYS at the container** (`data/`):

| Item | Why |
|---|---|
| `data/.git/` | one repo for the whole home; moving files inside it preserves history |
| `data/.global-agents/` | legacy compatibility location for shared agents; temporary technical debt |
| `data/.cabinet-state/` | machine/app-level runtime (ports, disclaimer-ack, file-schema) |
| `data/.cabinet-meta/audit.log` | app-level audit (could split per-room later) |
| `data/.agents/.config/{user,providers,onboarding-complete,integration-environments}.json` | **global app config** |

**Stays in place, becomes a sibling room**: existing top-level cabinets (`salesons`, `dauther`,
`fff`, …) already have `.cabinet`. No move; they stop being "children of the root room" once the
root cabinet is gone. They get a fresh per-room search index on first search (lazy reindex). The
migration backfills a `room:` block + `kind: room`.

> **The split that bites:** `data/.agents/.config/` mixed per-room identity (`company`,
> `workspace`) with **global app config** (`user`, `providers`, `onboarding-complete`,
> `integration-environments`). Migration splits it; every reader of those globals already points
> at the home location.

---

## 6. Where things live in the code

| Concern | Implementation |
|---|---|
| Room list | `listRooms()` (`src/lib/cabinets/rooms.ts`) — top-level dirs with a `.cabinet`, excluding `kind:home`. |
| Default / reopen room | `resolveDefaultRoom()` + `data/.home/home.json`; target adds `lastActivePath` resolution before room fallback. |
| Rooms store (client) | `src/stores/rooms-store.ts` — cached fetch from `/api/rooms`. |
| Switcher UI | `src/components/sidebar/room-switcher.tsx` (+ `room-icons.tsx`, `room-edit-dialog.tsx`). |
| Landing | `app-shell.tsx` redirects the bare home section into the default room; `handleWizardComplete` refreshes the rooms store post-onboarding. |
| Tree scope | Rooted per active room (`tree-view.tsx` uses the room's subtree). |
| Search scope | Target: one room index per room. Current and future callers must always pass / resolve an active room. Cross-room search is only via an explicit `includeOtherRooms` / "Search other rooms" UI. |
| Roll-up cap | `overview.ts` returns no descendants for the home (`DATA_DIR`), so no parent can see another room. |
| Per-room theme | `src/components/layout/room-theme-sync.tsx` (mounted in `layout.tsx`). |
| Creation | `/api/cabinets/create` (room vs child by `parentPath`); `cabinet-scaffold.ts` (`kind` union incl. `room`/`home`). |
| Onboarding | `/api/onboarding/setup` scaffolds the first room at `data/<slug>/`, writes the home marker, keeps global config at the container. |
| Multi-window | `src/lib/cabinets/room-window.ts`; Electron `cabinet:open-window` IPC (`electron/main.cjs`) + `preload.cjs` `CabinetDesktop.openWindow`. |
| Migration | `scripts/migrate-rooms-v3.mjs` (idempotent, guarded by `data/.home/home.json`). |

### 6.1 Container config — `data/.home/home.json`

```jsonc
{
  "schemaVersion": 1,
  "kind": "home",
  "defaultRoom": "work",               // user-selected/default launch room
  "lastActiveRoom": "work",            // last room the user was in (per machine)
  "lastActivePath": "work/projects/acme" // deepest valid path to restore on reopen
}
```

Global app config (`user.json`, `providers.json`, `onboarding-complete.json`,
`integration-environments.json`) stays at `data/.agents/.config/` — the home container scope, not
inside any room. `data/.cabinet-state/` (machine state) also stays at the container.

---

## 7. Migration (existing installs)

Pre-v3 installs have a root cabinet at `data/` that parents the other rooms.
`scripts/migrate-rooms-v3.mjs` target behavior (idempotent, git-checkpointed):

1. No-ops if `data/.home/home.json` already exists.
2. Preflight: refuses to run if the search DB is locked (daemon holds it).
3. Git-checkpoints `data/` ("pre rooms-v3 migration") + writes a filesystem journal
   (`data/.home/migration-journal.json`) listing every planned move (resume/rollback).
4. Derives `rootSlug` from `data/.cabinet` `name`; de-collides against existing top-level dirs.
5. `git mv` (history-preserving) every item from §5's "moves INTO the room" list to
   `data/<rootSlug>/`.
6. Splits `.agents/.config/`: per-room files go into the room; global files stay at the container.
7. Writes `data/<rootSlug>/.cabinet` with `kind: room` + a `room:` block (backfills icon/color/theme).
8. For each existing top-level cabinet: backfills `kind: room` + `room:` block in its `.cabinet`.
9. Writes `data/.home/home.json` (`defaultRoom: <rootSlug>`, `kind: home`).
10. Commits ("rooms v3 migration"). Drops stale `.cabinet.db-shm/-wal`; the room reopens/reindexes.

**Safety:** the pre-migration commit is the rollback point. Migration is fully idempotent. Partial
failure leaves the journal; on next start, resume or roll back from it. Ships as
`cabinetai doctor --migrate-rooms` for manual invocation. New installs skip all of this —
onboarding creates the first room directly. Current implementation must be audited against this
target before calling the migration complete (see §10.7).

---

## 8. Pragmatic deviations (notes from implementation)

- **Why a thin `kind:home` cabinet instead of deleting `data/.cabinet`.** ~114 call sites default
  an absent `cabinetPath` to the root (`"."`). Rather than a risky full retire-`.` refactor, `data/`
  keeps a thin, **content-less** `kind:home` cabinet so those sites resolve to a valid but empty
  scope. The home has no content/agents and rolls up nothing; callers still must resolve a valid
  active room before surfacing content.
- **Cold-load theme flash (minor).** On a fresh load the global theme paints before the room
  theme, which resolves after the async rooms fetch. Acceptable; not blocking.
- **Verification.** The model, isolation, theme-on-switch, multi-window, and from-scratch
  onboarding were all verified via Chrome DevTools + filesystem inspection (see `PROGRESS.md`,
  2026-05-23).

---

## 9. Phased plan — status

- **Phase 1 — Switcher + room identity.** ✅ Shipped.
- **Phase 2 — Per-room theme.** ✅ Shipped (apply on switch + load, global fallback).
- **Phase 3 — Scoped search.** ⚠️ Partially shipped (room prefix filtering exists; per-room index,
  fail-closed defaults, and "Search other rooms" are pending in §10.1).
- **Phase 4 — Add / Edit / Create (room vs sub-cabinet).** ✅ Shipped.
- **Phase 5 — Multi-window.** ✅ Shipped (Electron native window + web `window.open`).
- **Phase 6 — Onboarding.** ✅ Shipped (creates `data/<slug>/` rooms + home marker).
- **Migration + sibling-room model (the v3 core).** ⚠️ Shipped in shape; safety hardening / tests
  remain in §10.7.
- **Phase 2 — Clean-path routing + section anchors.** 🚧 Started (§11): the nested-cabinet reload
  bug is fixed (marker-scan parser, 14 tests). The `/room` rename, clean-path cutover, Electron
  serving, and section anchors remain — sequenced to reuse the `lastActivePath` reopen layer.

---

## 10. Ship blockers & follow-ups (2026-06-13 review)

The stale-room-list and display-name rename regressions from 2026-05-27 have since been mostly
implemented in the current tree (dropdown refetch, focus/BroadcastChannel refresh, atomic manifest
writes, cache invalidation, inline errors). Keep them as regression-test targets, not primary design
gaps. The remaining work below is the shipping contract for the rooms model.

> **Implementation status (2026-06-13, branch `feat/rooms-hardening`).** Shipped + tested this pass:
> **§10.1 fail-closed search** (verified cross-room leak closed; 5 unit tests + API E2E) and
> **§10.5 reopen-to-last-path** (`lastActivePath` + resolver + `POST /api/rooms/active`; E2E). Already
> in the tree from prior work: **§10.3 delete** (lib + `DELETE /api/rooms` + slug-confirm UI +
> cross-window invalidation) and **§10.4 rename**. Also fixed: the nested-cabinet **reload bug**
> (§11 marker-scan parser, 14 tests). Still open: **§10.2 per-room chat** (needs a `cabinet_path`
> column + per-room `.chat/`), **§10.3 refinements** (commit-on-delete, stop scoped jobs/chats), and
> the rest of the **§11** clean-path cutover.

### 10.1 Search must fail closed to a room

**Status (2026-06-13): ✅ Implemented & verified.** `runSearch` fails closed (no room + no
opt-in ⇒ no results); `/api/search` resolves a valid room when none is passed; explicit
`includeOtherRooms` plumbed through the daemon; sidebar search now scoped (palette already was).
Tests: `test/search-room-scope.test.ts` (5). Browser E2E: scoped query = 1 room, `includeOtherRooms=1`
= many. Remaining nice-to-haves: the visible "Search other rooms" checkbox + source-room labels in
the palette UI (the backend contract is done).

**Decision.** Search defaults to the current room. A user can explicitly enable cross-room search
with a checkbox/toggle labelled "Search other rooms". Cross-room results must show the source room.

**Required behavior.**
1. Use one search index / DB per room as the target architecture.
2. Every search caller must pass or resolve a room. Missing `cabinetPath` falls back to a valid room
   (`lastActivePath` room → `lastActiveRoom` → `defaultRoom` → first room), never to global search.
3. `/api/search` and the daemon should fail closed: no unlabelled global search because one caller
   forgot a param.
4. Sidebar search, command palette search, agent/task search, and future surfaces all use the same
   room-resolution helper.
5. Cross-room search is an explicit request (`includeOtherRooms: true`) and is visually labelled.

**Current drift to fix.** The command palette threads `cabinet`; sidebar search currently does not.
The daemon treats missing `cabinet` as all rooms. That is acceptable only for the explicit
cross-room path.

### 10.2 Chat storage is per-room

**Decision.** Even though team chat is not currently obvious in the UI, chat data belongs to the
room. There is no product-level global chat in this pass.

**Required behavior.**
1. Thread `cabinetPath` through chat APIs and helpers.
2. Store channel metadata under `data/<room>/.chat/`.
3. Store messages with room scope, either in the room's DB/index or with a `cabinet_path` column if
   a transitional shared SQLite store remains.
4. Do not revive or extend legacy `data/.chat` / global message behavior without explicit
   migration and room labelling.

### 10.3 Delete room is soft-delete plus scoped commits

**Decision.** Room deletion moves the room to trash first; it does not immediately `rm -rf` user
data. This makes first-release delete recoverable by hand and gives support a clear escape hatch.

**Trash location.** `data/.trash/<slug>-<timestamp>/`

**Required behavior.**
1. Delete is inside Customize / room settings, disabled for the last remaining room.
2. Confirmation lists pages, agents, jobs, chat, and search index; requires typing the room slug.
3. The dialog warns: "This will stop running chats and jobs in this room. Continue?"
4. Before deletion, commit any dirty changes scoped to the target room and `data/.home/home.json`
   only. Leave unrelated dirty files alone. If scoped checkpointing fails, block deletion.
5. Stop running chats/jobs/agent sessions scoped to the room (best effort) after confirmation.
6. Close / invalidate room search and DB handles.
7. Move the directory to trash.
8. Update `home.json`: if the deleted room was `defaultRoom`, `lastActiveRoom`, or the room for
   `lastActivePath`, repoint to the next valid room/path.
9. Commit the deletion as a second commit. Stage only the moved room/trash path and home config.
10. Emit `rooms:invalidated` to all windows.
11. If the deleted room is active, switch to the next valid path/room and clear tree/editor state.

**Out of scope for first ship.** Restore UI, trash browser, permanent delete UI, bulk delete. Manual
restore is "move the room directory back out of `.trash` and restart/reindex."

### 10.4 Rename is display name now, slug/path later

**Decision.** Customize edits the **display name** only (`.cabinet` manifest `name`). It does not
rename the directory slug.

**Required behavior.**
1. UI copy says "Display name" and shows the immutable current slug.
2. If a user asks to rename the room path/slug, show a separate advanced flow rather than silently
   changing only the display name.
3. True slug/path rename is a future migration job: warn about impact, stop room jobs/chats, move
   files, update `home.json`, rebuild search, update scoped references, and commit before/after.

### 10.5 Reopen to the last valid path

**Status (2026-06-13): ✅ Implemented (server + room-level landing); deep-path restore lands with §11.**
`home.json.lastActivePath` + `setLastActive()` + `resolveReopen()` (lastActivePath → lastActiveRoom →
defaultRoom → first room); `GET /api/rooms` returns a reopen target; `POST /api/rooms/active` persists
it; app-shell persists the current path (debounced) and lands on the last active room. API E2E: persist
a nested path → reopen returns it; unknown room and `.` ignored. The full deepest-path cold restore
(not just the room) completes with the §11 route layer; within a returning tab the persisted route
already restores the deep path.

**Decision.** On app reopen, restore the deepest valid path the user was using, not merely the room.

**Required behavior.**
1. Persist `lastActivePath` on navigation/switch, alongside `lastActiveRoom`.
2. Reopen fallback chain: valid `lastActivePath` → valid `lastActiveRoom` → valid `defaultRoom` →
   first valid room → onboarding / no-room recovery.
3. If `home.json` points at a room/path without a `.cabinet` or existing path, heal it best-effort.

### 10.6 `.global-agents` is temporary technical debt

`.global-agents` may stay for compatibility, but it is not the desired product model. Do not add new
features that depend on global agents unless the work also defines the replacement shared-agent
design, permissions, UI labelling, and migration path.

### 10.7 Tests required before calling v3 "done"

Add focused tests for:

1. `listRooms()` ignores plain folders and `kind: home`.
2. `resolveDefaultRoom()` / reopen resolution heal stale room/path pointers.
3. Search from room A never returns room B unless `includeOtherRooms` is explicit.
4. Sidebar search and command palette search use the same room resolver.
5. Chat APIs cannot read/write another room without an explicit room path.
6. Delete refuses home, nested paths, non-rooms, and last remaining room.
7. Delete stages/commits only scoped room/home changes and leaves unrelated dirty files alone.
8. Migration is idempotent, journaled/resumable, and rollback-safe.

---

## 11. Clean-path routing & section anchors (Phase 2)

> **Sequenced after §10.** Phase 2 reuses the `lastActivePath` persistence from §10.5 as its single
> source of truth for reopen (replacing the legacy `cabinet.last-route` hash). Build §10 first.

> **Status (2026-06-13): 🚧 partially shipped.** ✅ The **nested-cabinet reload bug is fixed**:
> `parseHash` now marker-scans for the first `data`/`agents`/`tasks` segment, so deep cabinet paths
> round-trip instead of collapsing to the first segment (`buildHash` exported; 14 tests in
> `test/hash-route.test.ts` incl. the exact production repro + a `buildHash∘parseHash` identity
> property; browser E2E: a deep page reloads to the same URL and renders). Reserved cabinet names:
> `data`/`agents`/`tasks`. The legacy no-`/data/` page form now resolves to a cabinet root (accepted
> back-compat change; the canonical builder always emits `/data/`).
> ⏳ **Remaining (the cutover):** the `/room` rename, dropping `/data/` + the doubled prefix from live
> URLs, `useHashRoute → useRoute` (pathname + History API), the `[[...slug]]` catch-all + Electron
> `main.cjs` clean-path serving, section anchors (`rehype-slug` + scroll-to-`#`), and the legacy-hash
> redirect. This is one focused, app-wide change best verified step-by-step in the browser.

### 11.1 Problem

The web UI routes off the URL **hash** (`#/cabinet/<path>`), which causes three problems:

- **A reload bug.** Nested ("deep") cabinet paths don't round-trip. `buildHash` writes the cabinet
  path with literal slashes, but `parseHash` reads it as a **single segment** (`parts[1]`), so
  reloading `#/cabinet/hilas-home/cabinet-data/Development/dev/...` collapses to
  `#/cabinet/hilas-home/`. (Root cause: two encoding conventions — literal slashes in `buildHash`,
  one `%2F`-encoded segment in `buildTaskHash` — and the parser only understands the latter.)
- **URLs that don't match the file tree.** A phantom `/data/` routing delimiter (not a folder), the
  cabinet prefix repeated ("doubling"), `index`/`.md` shown, and the word `cabinet` where the
  top-level segment is really a **room**.
- **`#` is consumed by routing,** so there is no way to deep-link to a heading inside a page.

### 11.2 Target URL scheme

| Thing | Today | Target |
|---|---|---|
| A room | `#/cabinet/hilas-home` | `/room/hilas-home` |
| Nested page | `#/cabinet/cabinet-examples/data/cabinet-examples/cabinets/audits/_template/progress` | `/room/cabinet-examples/cabinets/audits/_template/progress` |
| Folder index | `.../feedback-tracker/index` | `.../feedback-tracker` |
| A file | `.../ingestion` | `.../ingestion` (`.md` hidden; non-md keep their extension) |
| Cabinet agents/tasks | `#/cabinet/{cab}/agents` | `/room/{room}/{nested}/-/agents`, `…/-/tasks/{id}` |
| Section in a page | (impossible) | `.../progress#risks` |
| Globals | `#/settings/{tab}`, `#/help` | `/settings/{tab}`, `/help`; `/` = home |

**Rules.** The root-relative path is emitted **once** after `/room/` (so `/data/` and the doubling
both disappear by construction). Pages use the **virtual path** (already strips `index.md`/`.md`).
**`/-/`** (GitLab-style, reserved) separates the cabinet path from a functional view. **`#`** is
reserved for in-page heading anchors.

### 11.3 Design

- **Serving.** `next.config.ts` is `output: "standalone"` (a real server, not a static export). Add a
  catch-all `src/app/[[...slug]]/page.tsx` rendering `<AppShell/>`; explicit routes (`/api`, `/login`,
  `/tasks`, …) still win. No middleware. Assets are absolute, so serving at `/room/...` breaks nothing.
- **Route module** `src/lib/navigation/route-scheme.ts`: `buildPath(section, pagePath)` /
  `parsePath(pathname)`. Parse splits on the `/-/` marker — before it is the cabinet/page path (any
  depth), after it is the view (`agents[/slug|/subtab]`, `tasks[/id]`); no marker means content, and
  the owning cabinet is derived for scope. `RouteState`/`SectionState` are unchanged.
- **Hook.** `useHashRoute` → `useRoute`: read/write `window.location.pathname` via
  `pushState`/`replaceState` + `popstate`. Back/forward (`app-store` nav history) moves off `hashchange`.
- **Electron.** The renderer loads from the HTTP server (dev `localhost:4000`; prod embedded
  `.next/standalone/server.js`), not `file://`. `src/lib/cabinets/room-window.ts` + `electron/main.cjs`
  pass clean paths instead of hashes; no custom protocol needed.
- **Section anchors (runtime ids; markdown files untouched).** Add `rehype-slug` to
  `src/lib/markdown/to-html.ts`; unify on one slug function with
  `src/components/editor/extensions/heading-anchors.ts` (whose decoration ids already reach the live
  DOM); scroll to the `#fragment` element on load + on `hashchange`. `#page:` wiki-links stay
  intercepted in `editor.tsx`; a bare `#heading` falls through to scroll.
- **Back-compat.** On load, translate legacy `#/cabinet/...` / `#/p/...` / `#/tasks/...` hashes to the
  new clean path and `replaceState`, so old bookmarks, shared links, and the persisted route keep working.

### 11.4 Collisions & reserved names

The SPA avoids top-level segments owned by real Next routes (`api`, `agents`, `agent-preview`,
`agents-demo`, `demo`, `login`, `providers-demo`, `tasks`); content always lives under `/room/...`.
`-` is reserved (the view marker); a cabinet should not be named `room`. Folders named `agents`/`tasks`
are safe (the `/-/` marker disambiguates). Legacy real routes `src/app/tasks` and
`src/app/agents/conversations/[id]` are reconciled (kept or folded into the SPA) during the migration.

### 11.5 Tests (Phase 2)

`test/route.test.ts` (renamed from `hash-route.test.ts`): deep room root, deep page, deep agents/tasks
(+ sub-tab, slug, id), the round-trip property `parsePath(buildPath(x)) == x` for nested cases, legacy
`#/cabinet/...` → clean-path translation, and `#heading` non-collision with `#page:`.

**Files:** `src/hooks/use-hash-route.ts` → `useRoute`; new `src/lib/navigation/route-scheme.ts` and
`src/app/[[...slug]]/page.tsx`; `src/lib/navigation/task-route.ts`, `src/lib/cabinets/room-window.ts`,
`electron/main.cjs`, `src/lib/markdown/to-html.ts`,
`src/components/editor/extensions/heading-anchors.ts`, `src/components/editor/editor.tsx`,
`src/stores/app-store.ts`, `test/route.test.ts`.

---

*Decision source: product Q&A 2026-05-23 (true sibling rooms with migration; full design before
implementation). v1 (flatten) and v2 (lighter) are superseded; their intent is preserved in §
version-history for context.*
