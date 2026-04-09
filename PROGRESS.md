# Progress

[2026-04-09] Added per-team KB path configuration in Team Settings. Each team can now point its KB to any absolute path on disk (e.g. a project repo's docs/ folder). StatusBar git status and Sync button now route through /api/teams/{slug}/git/* so they reflect the active team's repository. Default remains CABINET_DATA_DIR/teams/{slug} when no path is set.

[2026-04-09] Merged feat/improvments → feat/multi-tenant-auth (rebased onto origin/main). Added multi-tenant OAuth auth via better-auth (Google + GitHub), team management with per-team KB isolation, SQL migrations 002-004, agent session isolation (PTY sessions tagged by userId/teamSlug), ElectronDetector client component (React 19 fix), and updated next.config.ts and .env.example for better-auth.

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


[2026-04-09] Added controllable git auto-commit via NEXT_PUBLIC_GIT_AUTO_COMMIT env var (default: enabled). When set to "false", auto-commit is disabled and the StatusBar footer gains Commit and Push buttons. The Commit button opens a modal showing all changed files with checkboxes (select which to stage), a commit message input, and uses the logged-in user's identity for the commit author. The Push button pushes to the GitHub remote using the user's OAuth access token stored in the account table. New API routes: POST /api/git/push and POST /api/teams/[slug]/git/push. GitHub OAuth now requests repo scope to enable push access.

[2026-04-09] Fixed Push button: SSH remotes (git@github.com:...) now push directly using system SSH keys instead of being rejected. Added push error modal that shows the full error message in a friendly dialog instead of just a tooltip when push fails.

[2026-04-09] Fixed push to always use GitHub OAuth token: SSH remotes (git@github.com:...) are now converted to authenticated HTTPS URLs before pushing, instead of relying on system SSH keys.

[2026-04-09] Added "Commit & Push" button to the commit modal. Clicking it commits the selected files then immediately pushes using the logged-in GitHub OAuth token. If commit succeeds but push fails, the dialog stays open and shows the push error inline.

[2026-04-09] Added plan document ai/plans/2026-04-09-controllable-git-commit-push.md covering the controllable auto-commit feature, manual Commit/Push UI, GitHub OAuth scope update, and all related API routes and components.
