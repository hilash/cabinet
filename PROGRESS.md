# Progress

[2026-04-18] Removed the loopback-HTTP call from `server/multica-poller.ts` → cabinet daemon. `waitForSession` used to poll `GET /session/:id/output` over 127.0.0.1 with a bearer token; now it invokes a `resolveSessionOutput(sessionId)` function the supervisor wires up from the in-process `PtyManager`. Extracted the three-stage resolution logic (active snapshot → persisted conversation meta + transcript-completed heuristic → 30-minute completed output cache) into a new `server/session-output.ts` that both `daemon-http.ts` (HTTP handler preserved for Electron/external callers) and `multica-poller.ts` consume. Delete count: `daemonFetch`, `getOrCreateDaemonToken` import, `getDaemonPort` import, the duplicated `readConversationMeta/finalizeConversation/...` wiring in `daemon-http.ts`. Net: `daemon-http.ts` −65 lines, `multica-poller.ts` shape simplified, one new focused module with 3 unit tests using a mock `PtyManager` (no HTTP server needed in the test loop). Plan §3 P2-B.

[2026-04-18] Reviewed the 5 `src/app/api/*` routes that still hand-roll try/catch and picked off the one clean win: `agents/personas/[slug]/export/route.ts` now goes through `createGetHandler` + `HttpError` (header-bearing `NextResponse` returned from the handler). Added boundary comments to the 4 routes that legitimately shouldn't use the wrapper: `agents/events/route.ts` (SSE stream, one-shot JSON shape doesn't apply), `pages/[...path]/route.ts` (GET/POST map lib error strings to 404/409 — needs typed errors in `page-io` first), `assets/[...path]/route.ts` and `upload/[...path]/route.ts` (both fs boundaries, non-JSON bodies). Chose to document-why rather than force-convert: forcing the wrapper onto SSE and fs-boundary routes would produce worse code than the raw try/catch it replaces.

[2026-04-18] Dropped the `src/lib/agents/` barrel re-export layer. 24 one-line `export * from "./subdir/xxx"` files (`agent-manager.ts`, `conversation-runner.ts`, `conversation-store.ts`, `cron-utils.ts`, `daemon-auth.ts`, `daemon-client.ts`, `goal-manager.ts`, `health-pipeline.ts`, `heartbeat.ts`, `notification-service.ts`, `nvm-path.ts`, `persona-manager.ts`, `provider-cli.ts`, `provider-interface.ts`, `provider-management.ts`, `provider-registry.ts`, `provider-runtime.ts`, `provider-settings.ts`, `requirement-pipeline.ts`, `responding-agents.ts`, `review-pipeline.ts`, `scaffold.ts`, `slack-manager.ts`, `task-inbox.ts`) deleted; all 67 call sites across `src/` and `server/` redirected directly to the subdir targets (`persona/`, `runtime/`, `pipeline/`, `provider/`, `inbox/`). Also moved the last root-level file `src/lib/agents/gallery.ts` into `src/lib/agents/persona/gallery.ts` to match the rest of the persona-facing APIs. Root `src/lib/agents/` is now an index: `index.ts` + 5 subdirs + nothing else — the subdir name literally reads the module's role. Zero behavior change, typecheck clean, 96 tests still pass.

[2026-04-18] Regenerated `cabinet-release.json` via `npm run release:manifest`. Fixed three stale URL/version fields that were still pointing at v0.2.12 despite `package.json` and `gitTag` already being on v0.4.1 — they would have broken the release-notes link and source-tarball download for 0.4.1+ installations. Release manifest now matches `package.json.version` end-to-end.

[2026-04-18] Removed two dead default-singleton exports in `server/services/telegram.module.ts` and `server/services/multica-poller.module.ts`. Both files ended with `export const telegramModule = createTelegramModule();` / `export const multicaPollerModule = createMulticaPollerModule();` — never imported anywhere (only the factories are used, by `daemon-supervisor.ts`). The defaults would have been trap doors if imported: neither passed a `waitUntilReady`, so they'd race `terminal-server` at startup. Deleted to match actual usage.

[2026-04-18] Extracted shared multica auth helpers into `server/multica-auth.ts`. Previously `readMulticaPATFile`, `multicaPATCandidates`, the `readMulticaPAT`/`getMulticaPAT` fallback chain, and `readWorkspaceIdFromFile` were duplicated across `server/telegram-bot.ts` and `server/multica-poller.ts` — same logic, drifted names, and one extra byte-for-byte copy of the JSON parser. New module exposes `getMulticaPatFile`, `getMulticaWorkspaceIdFile`, `readMulticaPATFile`, `readMulticaPAT(dataDir)`, `readMulticaWorkspaceId(dataDir)`. Both callers now import from the shared module; added 6 unit tests covering path helpers, file parsing, env fallback, and workspace id lookup. Net delta: -50 lines duplication, +45 lines module + tests.

[2026-04-17] Switched Claude Code one-shot harness to `stream-json` output. `providers/claude-code.ts` now emits NDJSON via `--output-format stream-json --verbose` and exposes `extractFinalResultFromStreamJson` as the provider's `parseOneShotStdout`; the parser prefers the terminal `result` event's `.result` field, falls back to concatenated assistant text blocks (skipping `tool_use`), and finally falls back to trimmed raw stdout. `provider-runtime.ts` `runOneShotProviderPrompt` now delegates post-processing to `provider.parseOneShotStdout` when present, so review/requirement/ai-edit pipelines receive clean assistant text without tool-call noise. Added `provider-interface.ts` optional `parseOneShotStdout` field and 6 parser unit tests in `providers/claude-code.test.ts`. Also fixed `npm test` globs by quoting so `**` expands recursively — all 48 tests now run (previously 22 were silently skipped when `providers/*.test.ts` was added).

[2026-04-17] Hardened docker-compose.yml and disabled auto-update. `docker-compose.yml` now requires `POSTGRES_PASSWORD` and `JWT_SECRET` via `${VAR:?...}` instead of defaulting to the literal string `multica` / `change-me-in-production`; running `docker compose up` without a real `.env` now fails loudly. Cleaned up `electron/main.cjs` `configureAutoUpdates` to be an actual no-op and dropped the unused `autoUpdater` / `update-electron-app` requires — previously the function returned early but still contained unreachable code referencing an external (hilash/cabinet) release feed that this local build should not follow. Also fixed `.env.example` `CABINET_PUBLIC_DAEMON_ORIGIN` to use `http://` to match the runtime-config default.

[2026-04-17] Sweep orphan tasks on multica-poller startup. `startMulticaPoller()` now calls `POST /api/daemon/runtimes/{id}/tasks/sweep` for each runtime after loading personas, so tasks that were dispatched while the cabinet daemon was offline get failed server-side instead of staying pinned as "dispatched" and blocking new claims. Also hardened workdir resolution: both `task.prior_work_dir` (from Multica) and `persona.workdir` (from local frontmatter) now go through `resolveContentPath`, which throws on traversal outside `DATA_DIR`; unsafe tasks are failed with a clear error message. Capped agent-manager session output at 1MB with tail-keeping `pushOutput` to prevent a chatty agent from OOM'ing the host.

[2026-04-17] Switched Multica PAT handoff from stdout to a 0600 file (`$MULTICA_EMBEDDED_DB_DIR/initial-pat`). On the Multica side, `server/cmd/server/main.go` added a `writeSecret` helper and replaced `fmt.Printf("MULTICA_PAT=...")` with a file write; on the Cabinet Electron side, `electron/main.cjs` replaced the stdout regex capture with `readInitialPatFile` polling after health check. Stdout is inherited by agent children and can surface in OS logs, so the previous path leaked the PAT; the file handoff keeps the secret scoped to the Electron main process.

[2026-04-17] Restored Next.js auth middleware by renaming `src/proxy.ts` back to `src/middleware.ts` and renaming the exported function from `proxy` to `middleware`. The file had been renamed in commit c4fe051, which silently disabled auth for all `/api/*` routes since Next.js only loads `src/middleware.ts` by convention. KB_PASSWORD protection is now effective again.

[2026-04-17] Cabinet multica-poller now exchanges its user PAT for a workspace-scoped Multica daemon token (`mdt_`) on first use and caches it at `.agents/multica-daemon-token.json` (0600). All `/api/daemon/*` calls to Multica use the `mdt_` token; on 401 the cache is invalidated and refreshed next cycle. If exchange fails (server not upgraded, no MULTICA_WORKSPACE_ID, network error), the poller falls back to the user PAT so existing deployments keep working. Telegram bot, Electron integration, and `multica-pat.json` config are untouched — this is transparent to existing users. Requires the Multica server side of the `#7` change (new `POST /api/daemon/auth/exchange` endpoint).

[2026-04-17] Sanitized env passed to agent PTY sessions. Added `server/env-sanitize.ts` exporting `buildAgentEnv()` which strips management-plane secrets (MULTICA_PAT, NEXT_PUBLIC_MULTICA_PAT, CABINET_DAEMON_TOKEN, KB_PASSWORD, TELEGRAM_BOT_TOKEN) before the env is handed to child processes. Wired into both PTY spawn sites (`server/cabinet-daemon.ts`, `server/terminal-server.ts`). Previously `process.env` was spread wholesale into the agent child, exposing tokens that any agent tool call could read via `env`.

[2026-04-15] Added bidirectional Telegram bot (`server/telegram-bot.ts`). Users can send messages to the bot, which automatically creates Multica issues and assigns to agents. Agent responses (issue comments) are polled and sent back to Telegram. Supports commands: /start, /help, /agents, /status, /agent <name> <task>, /cancel. Features: long-polling (no webhook needed), rate limiting (20/hour), tracked issue persistence to disk, 2-hour TTL auto-cleanup, proxy support, chat_id allowlist. Wired into cabinet-daemon.ts with hot-reload on integrations.json changes.

[2026-04-15] Added "Create Task" mode to the home screen. Users can now toggle between "创建任务" (task) and "对话" (chat) modes. In task mode, submitting the prompt creates a Multica issue via the `/multica-api/issues` proxy, with an agent selector dropdown for assignment. After creation, navigates to the issue detail view. Uses existing `multica_token` and `multica_workspace_id` from localStorage for auth, with Electron preload PAT fallback. Polished layout: greeting and subtitle separated, mode toggle and agent selector on one row, Chinese quick actions per mode, cleaner input area with send button at bottom-right.

[2026-04-15] Implemented Multica daemon task execution. Added `server/multica-poller.ts` — a self-contained task poller that scans agent personas for `multica_runtime_id`, polls `POST /api/daemon/runtimes/{id}/tasks/claim` every 30s, executes claimed tasks as PTY sessions via the cabinet daemon, and reports completion/failure back to Multica via the daemon API. Integrated into `cabinet-daemon.ts` (starts after HTTP server, stops on SIGINT, reloads on persona.md changes). Added `multica_runtime_id` field to `AgentPersona` type. Updated `.env.example` with `MULTICA_PAT` instructions.

[2026-04-11] Added Storage tab to Settings with data directory picker. Users can view the current data dir path, browse for a new one, or type a path manually. The setting is persisted to `.cabinet-install.json` and read by `getManagedDataDir()` at startup (env var still takes priority). A restart banner shows when the path changes. Also updated the About tab to show the actual data dir path.

[2026-04-11] Added Mermaid diagram viewer for .mermaid and .mmd files. Renders diagrams with the mermaid library, supports source toggle, copy source, and SVG export. Follows the current Cabinet theme (dark/light). Shows error state with fallback to source view if rendering fails.

[2026-04-11] Updated documentation for direct symlinks: shortened Load Knowledge section in getting-started, updated apps-and-repos page, added new "Symlinks and Load Knowledge" guide page under getting-started, updated data/CLAUDE.md linked repos section, and added Link2 + new file type icons to the sidebar icons table.

[2026-04-11] Added source/code viewer, image viewer, and video/audio player as first-class file viewers. Code files (.js, .ts, .py, .json, .yaml, .sh, .sql, +25 more extensions) open in a dark-themed source viewer with line numbers, copy, download, wrap toggle, and raw view. Images (.png, .jpg, .gif, .webp, .svg) render centered on a dark background with download/open-in-tab. Video/audio (.mp4, .webm, .mp3, .wav) use native HTML5 players. Tree builder now classifies files by extension and shows type-specific sidebar icons. Added node_modules and other build dirs to the hidden entries filter.

[2026-04-11] Load Knowledge now creates direct symlinks (`data/my-project -> /external/path`) instead of wrapper directories with a `source` symlink inside. Metadata is stored as dotfiles (`.cabinet.yaml`, `.repo.yaml`) in the target directory. Added `isLinked` flag to TreeNode for UI differentiation — linked dirs show a Link2 icon and "Unlink" instead of "Delete" in context menus. Updated `readPage` with `.cabinet.yaml` fallback for linked dirs without `index.md`, and `deletePage` to safely unlink symlinks while cleaning up `.cabinet.yaml`.

[2026-04-11] Added "Copy Relative Path" and "Copy Full Path" options to sidebar context menus. TreeNode menu gets both options; Knowledge Base root menu gets "Copy Full Path". Full path is resolved via `/api/health` with a client-side cache.

[2026-04-11] Added expandable setup guides to the Settings > Providers tab. Each CLI provider now has a "Guide" button that reveals step-by-step installation instructions with numbered steps, terminal commands (with copy buttons), "Open terminal" button, and external links (e.g. Claude billing). Also added a "Re-check providers" button. Matches the onboarding wizard's setup guide UX.

[2026-04-11] Added agent provider health status to the status bar. The health indicator now shows amber "Degraded" when no agent providers are available. Clicking the status dot opens a popup showing App Server, Daemon, and Agent Providers sections with per-provider status (Ready / Not logged in / Not installed). Provider status is fetched once on mount and refreshed each time the popup opens, with 30s server-side caching to avoid excessive CLI spawning.

[2026-04-11] Added Codex CLI login verification to onboarding agent provider step. Health check now runs `codex login status` to detect authentication (e.g. "Logged in using ChatGPT") instead of assuming authenticated when the binary exists. Updated the Codex setup guide to use `npm i -g @openai/codex` and simplified steps to: install, login, verify.

[2026-04-11] Updated Discord invite link to new permanent invite (discord.gg/hJa5TRTbTH) across README, onboarding wizard, status bar, settings page, and agent job configs.

[2026-04-10] Redesigned onboarding step 1 from "Tell me about your project" to "Welcome to your Cabinet". Added name and role fields (role uses predefined pill buttons: CEO, Marketer, Engineer, Designer, Product, Other). Moved goals question to step 2. Step 1 now requires both name and company name to proceed.

[2026-04-10] Fixed duplicate-key crash when a standalone .md file and a same-named directory coexist (e.g. `harry-potter.md` + `harry-potter/`). Tree builder now skips the standalone file when a directory exists. Link-repo API now auto-promotes standalone .md pages to directories with index.md when loading knowledge into them. Added warning banner to Load Knowledge dialog when the target page already has sub-pages.

[2026-04-10] Removed the first-launch data directory dialog from Electron. Cabinet now silently seeds default content (getting-started, example-cabinet-carousel-factory, agent library) into the managed data dir on every launch. Also fixed the build script referencing a wrong directory name (`cabinet-example` → `example-cabinet-carousel-factory`) and added `index.md` to the seed content. Created a new "Setup and Deployment" guide page covering data directory locations, custom `CABINET_DATA_DIR`, and upgrade instructions. Rewrote all getting-started pages to remove Harry Potter references and use the Carousel Factory example instead.

[2026-04-10] Renamed "Add Symlink" to "Load Knowledge" across the UI. Redesigned the dialog: top section has folder picker and name (for everyone), collapsible "For Developers" section exposes remote URL and description fields with explanation about symlinks and .repo.yaml. API now auto-detects git repos — only creates .repo.yaml for actual repos, plain directories just get the symlink. Updated getting-started docs.

[2026-04-10] Updated server health indicator to track both servers independently — App Server (Next.js) and Daemon (agents, jobs, terminal). Shows green "Online" when both are up, amber "Degraded" when only the daemon is down, and red "Offline" when the app server is down. Popup shows per-server status with colored dots and explains which features are affected. Added `/api/health/daemon` proxy route and updated middleware to allow all health endpoints.

[2026-04-10] Made "Add Symlink" available at every level of the sidebar tree, not just the root Knowledge Base label. Added the option to tree-node.tsx context menu, added parentPath prop to LinkRepoDialog, and updated the link-repo API to support creating symlinked repos inside subdirectories.

[2026-04-10] Restored "Add Symlink" option to the Knowledge Base context menu. It was lost when the sidebar was restructured to nest KB under Cabinet (commit e011d02). Moved LinkRepoDialog and its state from sidebar.tsx into tree-view.tsx where the context menu lives.

[2026-04-10] Added all 7 sidebar icon types to the example workspace: Posts Editor (full-screen .app with carousel slide previews, placeholder images, prompts, and platform/status filters), Brand Kit (embedded website without .app — Globe icon), media-kit.pdf (PDF — FileType icon). Updated .gitignore to track the renamed example directory and agent library templates.

[2026-04-10] Replaced Harry Potter example workspace with "Cabinet Carousel Factory" — a TikTok/Instagram/LinkedIn carousel content factory for marketing Cabinet itself. Includes: index.md (HQ page with brand guide, pipeline, hook formulas, posting schedule), competitors.csv (15 KB competitors updated daily by cron), content-ideas.csv (carousel backlog), content-calendar full-screen HTML app (.app) with Cabinet website design language (warm parchment, serif display, terminal chrome), .repo.yaml linking to Cabinet repo. Created 4 new agent personas (Trend Scout, Script Writer, Image Creator, Post Optimizer) and 3 scheduled jobs (morning briefing, daily competitor scan, weekly digest). Deleted old HP-themed content and jobs.

[2026-04-10] Fixed onboarding wizard to show all 20 agent library templates during fresh start, grouped by department (Leadership, Marketing, Engineering, etc.). Previously only 2-4 agents were shown via hardcoded suggestions. Now fetches templates from /api/agents/library and uses keyword matching against company description to smart pre-check relevant agents.

[2026-04-10] Pinned domain tag and agent count to the bottom of each carousel card using flex-col with mt-auto, and set a fixed card height so the footer row aligns consistently across all cards.

[2026-04-10] Made the "cabinet" logo in the sidebar header clickable — clicking it now navigates to the home screen, matching the behavior of clicking the Cabinet section label.

[2026-04-10] Added infinite carousel of "Cabinets" at the bottom of the home screen — 50 pre-made zero-human team templates with name, description, agent count, and color-coded domain badges. Carousel auto-scrolls and pauses on hover.

[2026-04-10] Changed home screen prompt input from single-line input to textarea. Enter submits the conversation, Ctrl/Cmd+Enter inserts a new line. Added a keyboard hint (⌘ + ↵ new line) next to the send button.

[2026-04-10] Added home screen that appears when clicking "Cabinet" in the sidebar. Shows a time-based greeting with the company name, a text input for creating tasks, and quick action buttons. Submitting a prompt starts a conversation with the General agent via /api/agents/conversations and navigates directly to the conversation view. Added conversationId to SelectedSection so the agents workspace auto-selects and opens the new conversation. Default app route changed from agents to home.

[2026-04-10] Made Knowledge Base sidebar item editable. Added data/index.md as the root KB page, a root /api/pages route for parameterless access, and split the KB sidebar button so the chevron toggles expand/collapse while clicking the label opens the page in the editor.

[2026-04-10] Unified sidebar: Agents and Knowledge Base nested under collapsible "Cabinet" parent. All items now use identical TreeNode styles (13px text, gap-1.5, h-4 w-4 icons, depth-based paddingLeft indentation, same hover/active classes). KB tree nodes render at depth 2 so they align with agent child items.

[2026-04-10] Fix false "Update 0.2.6 available" shown when already on 0.2.6. Root cause: stale cabinet-release.json (0.2.4) was used as current version instead of package.json. Updated the manifest and made readBundledReleaseManifest always use package.json version as source of truth.

[2026-04-10] Added Connect section to the About settings tab with Discord link (recommended) and email (hi@runcabinet.com).

[2026-04-10] Added default White and Black themes (neutral, no accent color) to the appearance tab. Reduced blur on coming-soon overlays from 3px to 2px with higher opacity.

[2026-04-10] Notifications settings tab now shows a blurred preview with "Coming Soon" overlay, matching the integrations tab treatment.

[2026-04-10] Integrations settings tab now shows a blurred preview of the MCP servers and scheduling UI with a centered "Coming Soon" overlay card on top.

[2026-04-10] Moved About section from Providers tab into its own About tab in settings with correct version (0.2.6) and product info.

[2026-04-10] Settings page tabs now sync with the URL hash (e.g. #/settings/updates, #/settings/appearance). Browser back/forward navigates between tabs. Added min-h-0 + overflow-hidden to the ScrollArea so tab content is properly scrollable.

[2026-04-09] Fix pty.node macOS Gatekeeper warning: added xattr quarantine flag removal before ad-hoc codesigning of extracted native binaries in Electron main process.

[2026-04-09] Added `export const dynamic = "force-dynamic"` to all `/api/system/*` route handlers. Without this, Next.js could cache these routes during production builds, potentially serving stale update check results and triggering a false "update available" popup on fresh installs.

[2026-04-09] Added Apple Developer certificate import step to release workflow for proper codesigning and notarization in CI. Deduplicated getNvmNodeBin() in cabinet-daemon.ts to use the shared nvm-path.ts utility.

[2026-04-09] Cap prompt containers to max-h with vertical-only scrolling. Added "Open Transcript" button to the prompt section in conversation-result-view (matching the existing one in Artifacts). Also added anchor link on the full transcript page.

[2026-04-09] Apply markdown rendering to Prompt section on transcript page via ContentViewer. Extracted parsing logic into shared transcript-parser.ts so server components can pre-render text blocks as HTML (client hydration doesn't work on this standalone page). Both prompt and transcript text blocks now render with full prose markdown styling.

[2026-04-09] Improved transcript viewer: pre-processes embedded diff headers glued to text, detects cabinet metadata blocks (SUMMARY/CONTEXT/ARTIFACT inside fenced blocks), renders orphaned diff lines with proper green/red coloring, renders markdown links and inline code in text blocks, styles token count as a badge footer. Also added +N/-N addition/removal counts in diff file headers.

[2026-04-09] Rich transcript viewer: diff blocks show green/red for additions/removals with file headers, fenced code blocks get language labels, structured metadata lines (SUMMARY, CONTEXT, ARTIFACT, DECISION, LEARNING, GOAL_UPDATE, MESSAGE_TO) render as colored badges. Copy button added to transcript section.

[2026-04-09] Render prompt as markdown on the transcript page too, with a copy button. Server-side markdown rendering via markdownToHtml, matching the prose styling used elsewhere.

[2026-04-09] Render conversation prompt as markdown in the ConversationResultView panel instead of plain text. Uses the existing render-md API endpoint with prose styling, falling back to plain text while loading.

[2026-04-09] Unified toolbar controls across all file types. Extracted Search, Terminal, AI Panel, and Theme Picker into a shared `HeaderActions` component. CSV, PDF, and Website/App viewers now include these global controls in their toolbars, matching the markdown editor experience.

[2026-04-09] Added "Open in Finder" option to each sidebar tree item's right-click context menu. Reveals the item in Finder (macOS) or Explorer (Windows) instead of only supporting the top-level knowledge base directory.

[2026-04-09] Fixed Claude CLI not being found in Electron DMG builds. The packaged app inherits macOS GUI PATH which lacks NVM paths. Added NVM bin detection (scans ~/.nvm/versions/node/) to RUNTIME_PATH in provider-cli.ts, enrichedPath in cabinet-daemon.ts, and commandCandidates in claude-code provider.


[2026-04-10] Added send icon to each agent card in the Team Org Chart. Clicking it opens the agent's workspace with the composer focused, letting users quickly send a task to any agent directly from the org chart. Also added to the CEO card.

[2026-04-10] Replaced send-icon navigation with a quick-send popup dialog on the Org Chart. Clicking the send icon on any agent card opens a blurred-backdrop modal with the full chat composer (textarea, @mentions, keyboard shortcuts). Submitting navigates to the conversation view.

[2026-04-10] Added in-app toast notifications for agent task completion/failure. When a conversation finishes, a slide-in toast appears in the bottom-right with agent emoji, status, and title. Clicking navigates to the conversation. Uses an in-memory notification queue drained by SSE. Documented in notifications.md.

[2026-04-10] Added notification sounds for task completion/failure toasts. Uses Web Audio API to synthesize tones — ascending chime for success, descending tone for failure. No audio files needed.
