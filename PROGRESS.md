# Progress

[2026-04-12] Created data/getting-started/ KB section with three pages: index (full file-type matrix + sidebar icon reference + keyboard shortcuts + features overview), apps-and-repos (embedded apps, full-screen .app mode, .repo.yaml spec), and symlinks-and-load-knowledge (Load Knowledge flow, .cabinet-meta, .repo.yaml, CABINET_DATA_DIR). Updated data/CLAUDE.md with a supported file types table covering all 13 types the tree-builder recognises. Updated data/index.md with a link to the new guide.

[2026-04-12] Cabinet page agents section: replaced individual bordered cards with a compact divider-based list. Agents are grouped by department (executive first, general last) with a muted section label row. Each row shows emoji, name, role, heartbeat pill, and active dot. The lead/CEO agent gets a small amber Crown icon inline with their name instead of a separate card.

[2026-04-12] GitHub stars counter animation in status bar: on first load, the star count animates from 0 to the real fetched value over 2 seconds using an ease-out cubic curve (requestAnimationFrame). When the counter reaches the final number, 8 gold ✦ particles burst outward in all 45° directions using CSS custom properties and a @keyframes animation. The explosion auto-hides after 900ms. Falls back to the static star count until real data arrives.

[2026-04-12] Added CabinetTaskComposer to cabinet homepage: a "What are we working on?" prompt box below the header with agent pills for all visible agents. Own-cabinet agents appear as a pill row; child-cabinet agents are grouped under their cabinet name as a labeled row below. Selecting a pill sets the target agent; Enter submits and navigates to the new conversation. Also updated buildManualConversationPrompt and the conversations POST route to accept cabinetPath so child-cabinet agent tasks run in the right cwd and store conversations in the correct cabinet.

[2026-04-12] Added RecentConversations panel to cabinet homepage: full-width card below the header showing the 20 most recent conversations across visible cabinets. Each row shows status icon (spinning/check/x), agent emoji, title, summary snippet, trigger pill (Manual/Job/Heartbeat), and relative timestamp. Running conversations show a pulsing indicator in the header. Clicking any row navigates directly to that conversation in the agent workspace. Auto-refreshes every 6 seconds.

[2026-04-12] Redesigned cabinet homepage to match the app design system: clean header with large title, description, stat pills (rounded-full bg-muted/primary tokens), and a segmented visibility scope control. Org chart uses proper rounded-xl border bg-card containers with CEO featured in a slightly elevated card, department labels as uppercase mono caps, and agent rows with emoji + role + heartbeat badge. Schedules panel follows the same card pattern with Clock/HeartPulse icon headers and rows with status badges. Removed gradient banner, icon box, kind tag, and parent name from back button.

[2026-04-12] Multi-cabinet conversation aggregation: when viewing a cabinet with "Include children" or "Include all descendants" visibility mode, the Agents Workspace now aggregates conversations from all visible cabinet directories. The conversations API accepts a `visibilityMode` query param and uses `readCabinetOverview` to discover descendant cabinet paths, then merges and sorts conversations from all of them. AgentsWorkspace passes the current visibility mode and re-fetches when it changes.

[2026-04-12] CEO agent first heartbeat for Text Your Mom example cabinet: created company/updates page with weekly priorities, added reality check to goals (50K MAU target requires marketing activation this week), added action-by-metric table to KPIs page, and linked updates section from root index. Three priorities set: ship P1 onboarding stories, activate paused marketing cabinets, and start investigating the critical reminder timing bug.

[2026-04-12] Cabinet UI interaction layer: clicking agents in the sidebar now opens AgentsWorkspace scoped to the cabinet (passes cabinetPath through section state → app-shell → AgentsWorkspace). Agent cards in the cabinet dashboard org chart are clickable. All agent API calls (persona GET, run, toggle, jobs) pass cabinetPath for cabinet-scoped resolution. JobsManager accepts cabinetPath prop.

[2026-04-11] Daemon recursive cabinet scheduling: the daemon now discovers all `.cabinet` files recursively under DATA_DIR and schedules heartbeats and jobs for every cabinet's agents. Schedule keys are cabinet-qualified (e.g., `example-text-your-mom/marketing/tiktok::heartbeat::trend-scout`) to prevent slug collisions across cabinets. Cabinet-level `.jobs/*.yaml` with `ownerAgent` are picked up alongside legacy agent-scoped jobs. The file watcher now monitors `**/.agents/*/persona.md`, `**/.jobs/*.yaml`, and `**/.cabinet` across all depths. API endpoints accept `cabinetPath` in request body so heartbeats and jobs execute in the correct cabinet scope with the right cwd.

[2026-04-11] Cleaned data directory: moved all old content (agents, jobs, missions, playbooks, chat, and content dirs) to `old-data/` at project root. Created root `.cabinet` manifest and `index.md` for the root cabinet. Renamed `data/.cabinet/` (runtime config dir) to `data/.cabinet-state/` to avoid conflict with `.cabinet` manifest file.

[2026-04-11] Onboarding provider step: redesigned to show only working providers as selectable radio cards with model selector. Users choose their default provider (Claude Code or Codex CLI) and pick a model (sonnet/opus/haiku or o3/o4-mini/gpt-4.1). Selection is saved to provider settings on launch. Non-working providers show setup guides in an expandable section.

[2026-04-11] Onboarding launch step: replaced right-side activity feed with animated agent chat preview. Agents now appear to talk to each other in a #general channel — CEO greets the team, delegates tasks to selected agents by name, and agents reply and coordinate. Messages appear one-by-one with typing indicators. Panel height reduced.

[2026-04-11] Onboarding wizard: added final "Start your Cabinet" step with summary card (company, agents, provider status) and data directory choice — "Start fresh here" uses the current dir, "Open existing cabinet" lets users pick a folder via native OS dialog. If a custom dir is chosen, it's saved via the data-dir API before launching.

[2026-04-11] Onboarding intro page: added staggered entrance animations. Elements fade in and slide up sequentially — card border appears first, then "cabinet" title, pronunciation/noun, each dictionary definition one by one, tagline lines, and finally the "Get started" button. Total sequence ~4.2s.

[2026-04-11] Onboarding wizard: limited agent selection to max 5 with CEO and Editor as mandatory (can't uncheck, show "Required" label). Unchecked agents dim and become unclickable at limit. Added counter display. Changed "How big is your team?" to a blurred "Pre-made multi-human multi-agent teams" section with "Coming soon" overlay.

[2026-04-11] Added show/hide hidden files setting in Appearance tab with checkbox and keyboard shortcut display (⌘⇧. / Ctrl+Shift+.). The toggle is persisted to localStorage and reloads the sidebar tree. Also registered the global keyboard shortcut matching macOS Finder behavior.

[2026-04-11] Added fallback viewer for unsupported file types. Files like .docx, .zip, .psd, .fig, .dmg etc. now appear in the sidebar (grayed out) and show a centered "Open in Finder" + "Download" view. Uses a whitelist approach — only common document, archive, and design file extensions are shown; everything else is silently skipped. Added `/api/system/reveal` endpoint for macOS Finder integration.

[2026-04-11] Added Storage tab to Settings with data directory picker. Users can view the current data dir path, browse for a new one, or type a path manually. The setting is persisted to `.cabinet-install.json` and read by `getManagedDataDir()` at startup (env var still takes priority). A restart banner shows when the path changes. Also updated the About tab to show the actual data dir path.

[2026-04-11] Added Mermaid diagram viewer for .mermaid and .mmd files. Renders diagrams with the mermaid library, supports source toggle, copy source, and SVG export. Follows the current Cabinet theme (dark/light). Shows error state with fallback to source view if rendering fails.

[2026-04-11] Updated documentation for direct symlinks: shortened Load Knowledge section in getting-started, updated apps-and-repos page, added new "Symlinks and Load Knowledge" guide page under getting-started, updated data/CLAUDE.md linked repos section, and added Link2 + new file type icons to the sidebar icons table.

[2026-04-11] Added source/code viewer, image viewer, and video/audio player as first-class file viewers. Code files (.js, .ts, .py, .json, .yaml, .sh, .sql, +25 more extensions) open in a dark-themed source viewer with line numbers, copy, download, wrap toggle, and raw view. Images (.png, .jpg, .gif, .webp, .svg) render centered on a dark background with download/open-in-tab. Video/audio (.mp4, .webm, .mp3, .wav) use native HTML5 players. Tree builder now classifies files by extension and shows type-specific sidebar icons. Added node_modules and other build dirs to the hidden entries filter.

[2026-04-11] Load Knowledge now creates direct symlinks (`data/my-project -> /external/path`) instead of wrapper directories with a `source` symlink inside. Metadata is stored as dotfiles (`.cabinet-meta`, `.repo.yaml`) in the target directory, while legacy `.cabinet.yaml` is still read for compatibility. Added `isLinked` flag to TreeNode for UI differentiation — linked dirs show a Link2 icon and "Unlink" instead of "Delete" in context menus. Updated linked-folder page fallback and symlink cleanup to support the new metadata file plus the legacy filename during transition.

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
