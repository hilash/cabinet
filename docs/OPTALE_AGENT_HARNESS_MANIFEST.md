# Optale Agent Harness Manifest

Status: first manifest slice
Date: 2026-05-02

## Canonical Source

The Optale Agent Harness manifest is the canonical source for Optale Command agent definitions.

The first slice lives in:

- `src/lib/optale/agent-harness/agent-definition.ts`
- `src/lib/optale/agent-harness/optale-meta-manifest.ts`

Each `AgentDefinition` is schema-versioned and includes identity, role, instructions, provider/model defaults, scope, memory namespace, MCP/tool policy, handoff edges, schedules, approval policy, and runtime projection metadata.

## LibreChat Bridge

The existing LibreChat Mongo scripts remain temporary reference and bridge material during migration:

- `/home/thor/projects/librechat/api/scripts/optale/upsert-optale-meta-agents.cjs`
- `/home/thor/projects/librechat/api/scripts/optale/smoke-optale-meta-agents.cjs`

Those scripts are not canonical agent definitions. The manifest records legacy LibreChat agent IDs and MCP server/tool metadata only so Optale Command can project into the bridge while LibreChat Command Centre remains the production chat, RAG, and runtime bridge.

## Future Projection

Native Optale Command agents, personas, and routines should be generated or imported from this manifest later. Runtime wiring is intentionally out of scope for this slice; validation only proves the manifest shape, roster coverage, bridge projection metadata, and handoff integrity.

Do not rename the repo, folder, PM2 process, or domain as part of this manifest work.
