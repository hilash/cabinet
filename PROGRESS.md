# Progress

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

[2026-04-09] Fixed startup EADDRINUSE collision: added --port 3100 to dev and start:next scripts in package.json so Cabinet no longer defaults to port 3000 (used by Bodega One).

[2026-04-10] Fixed three critical startup issues: (1) `npm run dev` now starts both Next.js and the cabinet daemon together (daemon was previously only started via `dev:all`). (2) Removed duplicate Tiptap Link extension — StarterKit v3 bundles Link by default; added `link: false` to StarterKit.configure() so the custom wiki-link-aware version is the only registration. (3) Renamed `src/middleware.ts` to `src/proxy.ts` per Next.js 16.2.1 convention. Verified Bodega One connection: health, llm/health, and sessions endpoints all respond correctly (defaultModel: qwen3.5:2b).

[2026-04-10] Applied Bodega One dark theme to Cabinet: replaced achromatic grayscale `.dark` CSS custom properties with violet-accented palette — `#7936FC` purple for primary/accent/ring, violet-tinted surfaces (chroma 0.005 at hue 290), warm off-white foreground, and a purple-to-cyan gradient chart palette.
