# Bodega One Integration — Cabinet Fork

## What This Is

This is a fork of [hilash/cabinet](https://github.com/hilash/cabinet) maintained by the
[BodegaoneAI](https://github.com/BodegaoneAI) org for integration with the Bodega One platform.

**Branch:** `bodega-integration`

---

## Goal

Replace Cabinet's CLI-based LLM execution (which shells out to `claude`, `codex`, etc. via a PTY)
with **Bodega One's provider-agnostic agentic loop**.

Cabinet agents currently run by:
1. Spawning a PTY via `node-pty`
2. Running a CLI tool (`claude --dangerously-skip-permissions`, etc.)
3. Detecting idle prompt state to know when the run is complete

Bodega One replaces step 2 entirely — we call our own agentic loop, which handles provider
routing, retries, tool execution, and streaming output back to the Cabinet daemon over the
existing WebSocket/PTY session channel.

---

## Architecture: How Cabinet's Provider System Works

Cabinet has a clean provider registry pattern:

```
src/lib/agents/
  provider-interface.ts     ← AgentProvider interface (the integration contract)
  provider-registry.ts      ← Singleton registry; all providers registered here
  provider-runtime.ts       ← Resolves providers, builds launch specs, runs one-shots
  providers/
    claude-code.ts          ← Claude Code CLI provider (default)
    codex-cli.ts            ← OpenAI Codex CLI provider
```

The `AgentProvider` interface (`provider-interface.ts`) defines two execution paths:

| Method | Mode | Used by |
|--------|------|---------|
| `buildSessionInvocation(prompt, workdir)` | Interactive PTY session | AI panel, terminal |
| `buildOneShotInvocation(prompt, workdir)` | Fire-and-forget subprocess | Jobs, headless runs |
| `runPrompt(prompt, context)` | API/async (no PTY) | `type: "api"` providers |

The **daemon** (`server/cabinet-daemon.ts`) calls `getSessionLaunchSpec()` →
`createDetachedSession()` → `pty.spawn(launch.command, launch.args, ...)`.

The `type: "api"` path in `provider-runtime.ts:116` supports non-PTY async providers
via `runPrompt()` — this is the cleanest slot for Bodega One's agentic loop.

---

## Integration Plan

### New Files (bodega-* namespace)

| File | Purpose |
|------|---------|
| `src/lib/agents/providers/bodega-one.ts` | Bodega One `AgentProvider` implementation |
| `src/lib/agents/bodega-bridge.ts` | Adapter: translates Cabinet's prompt/context into Bodega One API calls, streams output back |

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/agents/provider-registry.ts` | Register the `bodega-one` provider |
| `server/cabinet-daemon.ts` | Add `POST /bridge` endpoint for Bodega One push-style output (if needed) |

### What We Are NOT Changing

- Cabinet's UI, editor, file storage, or git integration
- The `AgentProvider` interface itself (we implement it, not modify it)
- Any existing provider (claude-code, codex-cli) — they stay as fallbacks
- The PTY session infrastructure in the daemon

---

## Integration Approach

### Option A — `type: "api"` Provider (Preferred for One-Shot)

Implement `bodega-one` as `type: "api"` with a `runPrompt()` method. This plugs directly into
`runOneShotProviderPrompt()` in `provider-runtime.ts` without touching the PTY layer.

```ts
// src/lib/agents/providers/bodega-one.ts (sketch)
export const bodegaOneProvider: AgentProvider = {
  id: "bodega-one",
  type: "api",
  runPrompt: async (prompt, context) => {
    return bodegaBridge.run({ prompt, context });
  },
  // ...
};
```

### Option B — PTY-Compatible CLI Shim (For Session Mode)

For the interactive AI panel, Cabinet expects a PTY process it can write to and read from.
`bodega-bridge.ts` can expose a local stdio shim that wraps our HTTP/SDK calls and streams
output back as plain text — Cabinet's ANSI-stripping logic handles the rest.

---

## Key Observations from Codebase Read

1. **Provider selection is runtime-configurable** via `provider-settings.ts` and a per-agent
   `providerId` field — switching to Bodega One can be opt-in per agent without breaking others.

2. **The daemon's `POST /trigger` endpoint** (`cabinet-daemon.ts:875`) accepts `{ prompt, providerId }`
   — we can route to `"bodega-one"` via this endpoint without WebSocket involvement.

3. **Output finalization** (`finalizeConversation`) parses a `<cabinet>` block in the transcript
   for structured summary/artifact data. Our bridge output should include this block to integrate
   with Cabinet's conversation UI.

4. **The `postinstall` script is macOS-only** (`chmod`/`xattr` on darwin arm64 binaries).
   On Windows/Linux, use `npm install --ignore-scripts`. Note this in team onboarding.

5. **Build is clean** — `next build` passes with zero type errors on `bodega-integration` branch.

---

## Modular Principles

- All new files use the `bodega-*` naming convention for easy upstream diff tracking
- No changes to Cabinet's core data model or file structure
- Provider registration is additive — existing providers remain as fallbacks
- The bridge is stateless; Cabinet owns session/conversation state

---

## Status

- [x] Fork created: `BodegaoneAI/cabinet`
- [x] Branch: `bodega-integration`
- [x] Dependencies installed, build verified clean
- [x] Codebase read: daemon, provider interface, provider runtime, registry, claude-code provider
- [ ] `bodega-bridge.ts` — implement
- [ ] `providers/bodega-one.ts` — implement
- [ ] Register in `provider-registry.ts`
- [ ] Integration test against local Cabinet instance
