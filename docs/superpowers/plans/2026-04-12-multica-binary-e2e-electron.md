# Multica Go Binary + E2E Tests + Electron Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multica Go server binary, run all Playwright e2e tests against the integrated app, and produce a complete Electron .app with the Go binary embedded.

**Architecture:** The multica Go server is built as a static binary (`CGO_ENABLED=1` for sqlite/pg drivers) and placed at `cabinet/build/multica-server`. Electron's `forge.config.cjs` packages it as an `extraResource`. At runtime, `electron/main.cjs` spawns the binary with `--embedded-db`, and the Next.js app proxies `/multica-api/*` to it.

**Tech Stack:** Go 1.25+, Next.js 16, Electron Forge, Playwright, embedded-postgres-go (PG17)

---

### Task 1: Build Multica Go Binary

**Files:**
- Create: `cabinet/scripts/build-multica-server.sh`
- Verify: `multica/server/cmd/server/main.go`
- Output: `cabinet/build/multica-server`

- [ ] **Step 1: Create the build script**

```bash
#!/usr/bin/env bash
# scripts/build-multica-server.sh
# Builds the multica Go server binary for the current platform
# and places it at build/multica-server for Electron packaging.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CABINET_ROOT="$(dirname "$SCRIPT_DIR")"
MULTICA_SERVER="${MULTICA_SERVER_SRC:-$CABINET_ROOT/../multica/server}"
OUTPUT="$CABINET_ROOT/build/multica-server"

# Default to current platform
GOOS="${GOOS:-$(go env GOOS)}"
GOARCH="${GOARCH:-$(go env GOARCH)}"

echo "Building multica-server for $GOOS/$GOARCH..."
echo "Source: $MULTICA_SERVER"
echo "Output: $OUTPUT"

mkdir -p "$(dirname "$OUTPUT")"

cd "$MULTICA_SERVER"

CGO_ENABLED=1 GOOS="$GOOS" GOARCH="$GOARCH" \
  go build -trimpath -ldflags="-s -w" \
  -o "$OUTPUT" \
  ./cmd/server

chmod +x "$OUTPUT"

echo "Built successfully: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
```

- [ ] **Step 2: Run the build script**

Run:
```bash
cd /Users/qwen/cabinet && chmod +x scripts/build-multica-server.sh && bash scripts/build-multica-server.sh
```

Expected: Binary at `build/multica-server`, roughly 30-60MB. No compile errors.

- [ ] **Step 3: Verify the binary starts**

Run:
```bash
cd /Users/qwen/cabinet && ./build/multica-server --help 2>&1 || ./build/multica-server -h 2>&1 || echo "Binary runs (no --help flag)"
```

Expected: Binary executes without crash. May print usage or start listening — either is fine, just confirm it's a valid executable.

- [ ] **Step 4: Commit**

```bash
cd /Users/qwen/cabinet
git add scripts/build-multica-server.sh
# Don't commit the binary itself — it's a build artifact
echo "build/" >> .gitignore 2>/dev/null || true
git add .gitignore
git commit -m "feat: add multica Go server build script"
```

---

### Task 2: Wire Build Script into Electron Packaging

**Files:**
- Modify: `cabinet/forge.config.cjs:154-156` (uncomment extraResource)
- Modify: `cabinet/package.json` (add `build:multica` script)

- [ ] **Step 1: Uncomment extraResource in forge.config.cjs**

In `cabinet/forge.config.cjs`, change lines 154-156 from:

```javascript
    // Multica Go server binary — uncomment and set the path once the binary
    // is built for the target platform (e.g. via `GOOS=darwin GOARCH=arm64 go build`).
    // extraResource: ["./build/multica-server"],
```

To:

```javascript
    extraResource: ["./build/multica-server"],
```

- [ ] **Step 2: Add build:multica script to package.json**

Add to the `"scripts"` section of `cabinet/package.json`:

```json
"build:multica": "bash scripts/build-multica-server.sh",
```

And update the `electron:package` script to include the multica build step. If the current script is:

```json
"electron:package": "npm run build && node scripts/prepare-electron-package.mjs && electron-forge package"
```

Change it to:

```json
"electron:package": "npm run build:multica && npm run build && node scripts/prepare-electron-package.mjs && electron-forge package"
```

Same for `electron:make` if it exists.

- [ ] **Step 3: Verify the wiring is correct**

Run:
```bash
cd /Users/qwen/cabinet && cat package.json | grep -A1 "build:multica\|electron:package\|electron:make"
```

Expected: `build:multica` script exists, `electron:package` runs it first.

- [ ] **Step 4: Commit**

```bash
cd /Users/qwen/cabinet
git add forge.config.cjs package.json
git commit -m "feat(electron): wire multica Go binary into packaging pipeline"
```

---

### Task 3: Run E2E Tests (Cabinet Dev Server Only)

**Files:**
- Verify: `cabinet/e2e/cabinet-basics.spec.ts`
- Verify: `cabinet/e2e/multica-integration.spec.ts`
- Verify: `cabinet/e2e/multica-navigation.spec.ts`
- Verify: `cabinet/e2e/search.spec.ts`
- Verify: `cabinet/playwright.config.ts`

- [ ] **Step 1: Install Playwright browsers if needed**

Run:
```bash
cd /Users/qwen/cabinet && npx playwright install chromium
```

Expected: Chromium browser downloaded (or already present).

- [ ] **Step 2: Start the Next.js dev server**

Run (in background):
```bash
cd /Users/qwen/cabinet && npm run dev &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"
```

Wait for it to be ready:
```bash
timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 2; done'
echo "Dev server ready"
```

- [ ] **Step 3: Run all Playwright tests**

Run:
```bash
cd /Users/qwen/cabinet && npx playwright test --reporter=list
```

Expected: 19 tests across 4 files. Cabinet-only tests (cabinet-basics, search) should pass. Multica integration/navigation tests may fail if no Go server is running — that's acceptable for this step. Record which tests pass/fail.

- [ ] **Step 4: Assess results and fix any cabinet-only test failures**

If any `cabinet-basics.spec.ts` or `search.spec.ts` tests fail, fix the issues. Multica tests failing without a Go server is expected — they should show graceful degradation (auth guard message, etc.).

- [ ] **Step 5: Stop dev server and commit any fixes**

```bash
kill $DEV_PID 2>/dev/null || true
```

If fixes were made:
```bash
cd /Users/qwen/cabinet
git add -A
git commit -m "fix(e2e): resolve test failures in cabinet-only tests"
```

---

### Task 4: Run E2E Tests with Multica Go Server

**Files:**
- Verify: `cabinet/e2e/multica-integration.spec.ts`
- Verify: `cabinet/e2e/multica-navigation.spec.ts`

- [ ] **Step 1: Start multica Go server with embedded DB**

Run:
```bash
cd /Users/qwen/cabinet && MULTICA_EMBEDDED_DB=true MULTICA_EMBEDDED_DB_DIR=/tmp/multica-e2e-db PORT=4321 ./build/multica-server &
MULTICA_PID=$!
echo "Multica server PID: $MULTICA_PID"
```

Wait for it to be ready:
```bash
timeout 30 bash -c 'until curl -s http://localhost:4321/health > /dev/null 2>&1; do sleep 2; done'
echo "Multica server ready"
```

- [ ] **Step 2: Start Next.js dev server with multica proxy**

The `next.config.ts` rewrites `/multica-api/*` to the Go server. The default port in rewrites may need to match. Check what port the rewrites target:

```bash
cd /Users/qwen/cabinet && grep -A2 "multica-api" next.config.ts
```

If it targets a different port than 4321, either:
- Change the PORT above to match, OR
- Set `MULTICA_PORT=4321` if the config reads from env

Then start the dev server:
```bash
cd /Users/qwen/cabinet && npm run dev &
DEV_PID=$!
timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 2; done'
```

- [ ] **Step 3: Run multica-specific e2e tests**

```bash
cd /Users/qwen/cabinet && npx playwright test multica-integration multica-navigation --reporter=list
```

Expected: Tests that check multica auth guard, navigation to hash routes, and basic UI rendering should pass. Some tests may need a valid multica session/workspace — those may still fail, which is acceptable.

- [ ] **Step 4: Record results and fix issues**

Document which tests pass and fail. Fix any test issues that are due to code bugs (not auth/session requirements).

- [ ] **Step 5: Cleanup and commit**

```bash
kill $DEV_PID $MULTICA_PID 2>/dev/null || true
rm -rf /tmp/multica-e2e-db
```

If fixes were made:
```bash
cd /Users/qwen/cabinet
git add -A
git commit -m "fix(e2e): resolve multica integration test issues"
```

---

### Task 5: Build Complete Electron Package

**Files:**
- Verify: `cabinet/forge.config.cjs`
- Verify: `cabinet/electron/main.cjs`
- Output: `cabinet/out/Cabinet-darwin-arm64/Cabinet.app`

- [ ] **Step 1: Ensure Go binary is built**

```bash
cd /Users/qwen/cabinet && ls -lh build/multica-server
```

Expected: Binary exists. If not, run `npm run build:multica`.

- [ ] **Step 2: Run electron:package**

```bash
cd /Users/qwen/cabinet && npm run electron:package
```

Expected: Build completes. Output at `out/Cabinet-darwin-arm64/Cabinet.app`. Size should be ~430-470MB (previous 405MB + ~30-60MB Go binary).

- [ ] **Step 3: Verify multica-server is inside the .app bundle**

```bash
ls -lh "/Users/qwen/cabinet/out/Cabinet-darwin-arm64/Cabinet.app/Contents/Resources/multica-server"
```

Expected: Binary exists at the Resources path. This is where `process.resourcesPath` points in packaged Electron apps.

- [ ] **Step 4: Quick smoke test of the packaged app**

```bash
open "/Users/qwen/cabinet/out/Cabinet-darwin-arm64/Cabinet.app"
```

Verify manually:
1. App launches without crash
2. Cabinet KB loads normally
3. Check Console.app or terminal for multica server spawn logs
4. Sidebar shows multica nav items (Inbox, Issues, etc.)
5. Clicking a multica nav item shows the auth guard or multica UI

- [ ] **Step 5: Commit packaging changes**

```bash
cd /Users/qwen/cabinet
git add forge.config.cjs package.json scripts/
git commit -m "feat(electron): complete packaging with embedded multica server"
```

---

### Task 6: Final Verification and Cleanup

**Files:**
- Verify: `cabinet/.gitignore` (build/ excluded)
- Verify: All commits are clean

- [ ] **Step 1: Verify .gitignore excludes build artifacts**

```bash
cd /Users/qwen/cabinet && grep "build/" .gitignore
```

Expected: `build/` is listed. Also verify `out/` is excluded.

- [ ] **Step 2: Run full e2e suite one final time**

```bash
cd /Users/qwen/cabinet
# Start multica server
MULTICA_EMBEDDED_DB=true MULTICA_EMBEDDED_DB_DIR=/tmp/multica-final-e2e PORT=4321 ./build/multica-server &
MULTICA_PID=$!
timeout 30 bash -c 'until curl -s http://localhost:4321/health > /dev/null 2>&1; do sleep 2; done'

# Start dev server
npm run dev &
DEV_PID=$!
timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 2; done'

# Run all tests
npx playwright test --reporter=list

# Cleanup
kill $DEV_PID $MULTICA_PID 2>/dev/null || true
rm -rf /tmp/multica-final-e2e
```

Expected: All cabinet-only tests pass. Multica tests pass where Go server is reachable.

- [ ] **Step 3: Final commit if any changes**

```bash
cd /Users/qwen/cabinet
git status
# If clean, nothing to commit
# If changes exist:
git add -A
git commit -m "chore: final cleanup after integration verification"
```

- [ ] **Step 4: Summary**

Print a summary of:
- Go binary size and location
- E2e test results (pass/fail counts)
- Electron .app size and location
- Any known issues or limitations
