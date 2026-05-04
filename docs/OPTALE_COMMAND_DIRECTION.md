# Optale Command Direction

Status: naming, desktop, and migration direction
Date: 2026-05-03

## Naming Decision

The product/app name is **Optale Command**.

**Observatory** is a workspace or mode inside Optale Command. It is the surface for Brain, Company Brain, Memory, Graph, Entities, Dreams, MCP policy, traces, evals, approvals, and operational visibility.

The current legacy Command Centre / LibreChat deployment remains the production chat, RAG, and runtime bridge during migration. Do not rename repositories, folders, PM2 processes, or domains as part of this decision.

## Active Project

The active ORM project for this build is **Optale Command Desktop**:

- identifier: `COMMAND-DESKTOP`
- project id: `9efbd0c3-28be-48c9-a475-4876ae53c0be`
- source spec: `docs/OPTALE_COMMAND_DESKTOP_SPEC.md`
- vault spec: `data/projects/optale-command-desktop/spec.md`

This project owns the desktop product shell direction: Cabinet fork as the native Electron base, Observatory as a mode inside Command, ORM/Twenty-inspired object UI, LibreChat-inspired chat/runtime behavior, and partner-ready macOS packaging.

## Migration Direction

The long-term goal is to consolidate agent administration, Brain, MCP policy, traces/evals, approvals, schedules, and eventually chat runtime into Optale Command.

During migration:

- Treat Observatory as a mode/workspace inside Optale Command, not a separate canonical product.
- Keep the legacy LibreChat Command Centre working while Optale Command reaches parity.
- Preserve existing Cabinet fork paths, process names, and domains until a separate migration step explicitly renames them.
- Preserve upstream Cabinet attribution and licensing where relevant.
- Rebrand desktop packaging and user-facing product identity through explicit desktop/product config, while preserving source compatibility during migration.

## Agent Definition Direction

Avoid duplicate canonical agent definitions.

Future Optale Agent Harness/manifest work should define agents once and project them into:

- native Optale Command agents/personas/routines
- legacy LibreChat agent docs only while the bridge is needed

Do not treat LibreChat `agent_optale_meta_*` Mongo scripts as canonical agent definitions, and do not commit them as the source of truth.
