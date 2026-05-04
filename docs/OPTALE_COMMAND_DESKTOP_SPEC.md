# Optale Command Desktop Spec

Status: active build spec
Date: 2026-05-03
ORM project: Optale Command Desktop (`COMMAND-DESKTOP`)
Project id: `9efbd0c3-28be-48c9-a475-4876ae53c0be`

## Goal

Optale Command is the canonical desktop product shell for Optale operators and partners.

The product should build on the Cabinet fork's native Electron desktop app rather than on a separate web-only prototype. Cabinet already has the strongest surfaces for local knowledge, files, agents, tasks, scheduling, composer workflows, and app packaging. Optale Command should preserve those strengths and add the governed operating graph underneath them.

## Product Shape

- **Command** is the primary workspace: composer, conversations, tasks, agents, files, and day-to-day operator work.
- **Observatory** is a mode inside Command: Brain, Company Brain, Memory, Graph, Entities, Dreams, MCP policy, traces, evals, approvals, and operational visibility.
- **Objects** is the first ontology-facing surface: spaces, companies, people, projects, tasks, agents, runs, sources, policies, actions, and relationships.
- **Actions** is the governed execution surface: command actions, proposals, runs, policy decisions, lineage, and audit.
- **Matrix/Element** remains the human team chat backbone. Cabinet's internal Agent Slack should stay as an agent activity/coordination surface unless it is later backed by Matrix.
- **LibreChat** remains the bridge/runtime reference during migration, especially for MCP/tool picker behavior, streaming state, source citations, model/provider controls, regenerate/edit/fork workflows, and artifact handling.

## Desktop Direction

The desktop app means Electron-native packaging: a normal macOS `.app`, ZIP, and DMG that wrap the Next.js/Cabinet shell and local daemon. It is not a Swift/AppKit rewrite.

The first packaging goal is partner-shareable macOS builds:

- product name: `Optale Command`
- default bundle id: `com.optale.command`
- signed and notarized DMG/ZIP before external partner distribution
- upstream Cabinet attribution and MIT license retained
- release repo, update feed, bundle id, icon, and data migration plan made explicit before partner rollout

Until release infrastructure is moved, source repository names, process names, app domains, and upstream Cabinet paths may remain unchanged.

## Access And Distribution Boundary

Optale Command is one desktop product shell with different capability profiles.

- **Optale operator/admin build** is for Thor and trusted Optale operators. It may expose admin settings, local daemon controls, provider/runtime configuration, raw diagnostics, approvals, policy authoring, secret routing status, and internal Observatory surfaces.
- **Partner/customer build** is a scoped, safer Command workspace. It should expose partner-relevant objects, tasks, sources, conversations, approvals, reports, and selected agent workflows, but hide internal admin controls, raw MCP ids, secret material, provider credentials, unrestricted terminal/local shell access, cross-tenant memory, and Optale-private data planes.
- **Role/capability gating** should be enforced in code and backed by OAG policy, not only hidden by UI conditionals.
- **Tenant/data isolation** is required before external partner use: separate data roots, scoped memory, scoped tool allowlists, scoped update/release channel, and explicit import/export boundaries.
- **Memory lanes** must remain separate. Partners/customers may have personal memory and scoped workspace/customer memory. Optale operators keep gated Company Brain and Optale-private memory access. Partner builds must not read Thor-private memory, Optale-private Company Brain, or another partner/customer tenant memory.
- **Partner distributions** should be built with the partner profile flags (`OPTALE_DESKTOP_PROFILE=partner`, `NEXT_PUBLIC_OPTALE_DESKTOP_PROFILE=partner`) so the packaged UI and server runtime agree on the safe capability lane.
- **Observatory surfaces** should degrade by role. Partners may see their own traces, lineage, approvals, and run history; Optale operators can see fleet-wide governance and infrastructure diagnostics.

The partner version should feel like the same product, not a separate lightweight clone, but it must be deliberately nerfed where capabilities could leak secrets or allow unsafe actions.

## UI Direction

Use the native Cabinet desktop shell as the baseline.

Keep and improve:

- Cabinet's Data drawer and editor/file/object flow
- Cabinet's Agents workspace
- Cabinet's Tasks board and task conversation view
- Cabinet's composer patterns
- Cabinet's local daemon and Electron packaging

Avoid rebuilding these from scratch in `/ui-lab`. Prototypes can inform language and layout, but the product work should land in the native shell.

## Chat Direction

Cabinet's composer is a strong base. Bring selected LibreChat behavior into Cabinet/Command:

- explicit model/provider/runtime chooser
- MCP/tool chooser with product-facing names, not raw internal MCP ids
- streaming turn states and clear tool-call progress
- citations and source footers
- tool artifacts as inspectable side panels
- regenerate, edit, fork, and continuation controls
- thread context controls that do not break the task/conversation model

Do not make LibreChat the canonical product shell. It remains a migration reference and bridge until Command reaches parity.

## Ontology Direction

Use ORM/Twenty as the practical UI reference for object records, relationship fields, saved views, tables, kanban-style work views, and admin-friendly schema management.

Use the Palantir deep dive as the operating model reference: data, objects, actions, agents, models, policies, lineage, and applications should share a governed graph. Governance and lineage are product primitives, not optional reporting.

Use Foundry-inspired OSS as design input only:

- `syzygyhack/open-foundry` can inform ODL/OAG shape, schema/compiler ideas, typed APIs, permissions, temporal state, and action framework design.
- `DioCrafts/OpenFoundry` is AGPL and should be studied for decomposition only unless we explicitly accept AGPL obligations.
- Cognee can augment Bridge as a document-to-knowledge-graph ingestion layer.

Existing Bridge remains the source-to-review-to-ontology handoff layer for Optale methods, reviews, compliance, and provenance.

## Agent Harness Boundary

The Agent Harness does not need to be completed before UI work continues. It should run in parallel.

Desktop UI work must still respect the harness direction:

- product-named tools in user-facing surfaces
- raw MCP/tool ids kept internal
- OAG object/action boundaries
- approvals for risky actions
- lineage and audit trails attached to runs
- one canonical agent definition projected into native Command and temporary bridge runtimes

## First Product Slices

1. Rebrand the desktop shell toward Optale Command while preserving Cabinet source/runtime compatibility.
2. Expose native Command, Observatory, Objects, and Actions modes from the shell.
3. Add role/capability gating for admin vs partner-safe desktop profiles before partner-facing distribution.
4. Improve the native chat/task conversation surface using Cabinet composer plus LibreChat-inspired streaming, model, MCP, and citation behavior.
5. Build the first OAG object explorer from the resource registry, ORM/Twenty UI patterns, and Palantir-style object/action lineage.
6. Prepare a signed, notarized, partner-shareable macOS distribution plan.

## Non-Goals

- No Swift rewrite.
- No Slack-clone rebuild inside Cabinet.
- No AGPL source import from AGPL Foundry-inspired projects.
- No raw MCP/internal tool names in user-facing UI.
- No partner build with unrestricted admin, terminal, secret, or cross-tenant memory access.
- No separate web-only Command prototype as the main product path.
