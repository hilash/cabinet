# Optale Command UI Prototype Notes

Date: 2026-05-03

## Product Direction

The next UI direction should start from the original Cabinet shell instead of from the current Observatory dashboard shape.

Cabinet's strengths:

- Quiet document-first workspace.
- Left sidebar as a working context, not a product menu.
- Space drawer pattern for Data, Agents, and Tasks.
- Small controls, compact rows, and predictable navigation.
- Main canvas only shows the layer the user chose.

Optale Command should keep that language and add the operating-map layer underneath it.

## Palantir Research Implication

The useful lesson is not to copy Palantir's visual UI. The lesson is the operating model:

- Objects, object types, object sets, actions, sources, agents, policy, lineage, traces, and apps need stable identities.
- AI outputs should land on inspectable ontology primitives.
- Observatory should be evidence and trace, not a separate monitoring dashboard.
- Command and Observatory can share one cockpit if backend boundaries stay clean.

The default UI should stay calm. Inspection should be one level deeper.

## ORM / Ontology Management Feasibility

It is feasible to bring ORM-style functionality into Optale Command over time, but it should not become the first user-facing mode.

Recommended framing:

- Treat ORM capabilities as "Objects" and "Types" inside the operating map.
- Start with read/search/explore/save object sets.
- Add schema/type editing later behind an advanced management layer.
- Keep raw graph, MCP, policy, lineage, and mapping diagnostics behind Inspect.

This avoids splitting the product into "ORM map" and "Command" as two competing places. Optale Command becomes the cockpit, while backend services remain separate.

## Prototype Scope

The prototype route is intentionally isolated at:

`/ui-lab/optale-command-v2`

It mocks:

- Cabinet-style sidebar and a single horizontal primary nav.
- Chat as the default first screen.
- Brain as the operating map.
- Agents as a roster plus chat/task split.
- Working Context as the right-side layer for KB context, sources, evidence, trace, and policy.

It does not change routing, data contracts, backend calls, or current production behavior.

## Iteration 2 Direction

The first prototype still read too much like a dashboard. The second prototype makes the default surface an LLM-standard chat workspace:

- Left: one coherent primary nav row for Chat, Data, Brain, Agents, and Tasks.
- Beneath the primary nav: vertical items relevant to the selected section only.
- Center: normal chat thread and composer for most work.
- Right: working context, sources, and inspect tabs.
- Data: Cabinet-like file/page view with alternate knowledge views.
- Tasks: only explicit tracked work, not every conversation.
