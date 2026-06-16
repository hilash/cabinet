import test from "node:test";
import assert from "node:assert/strict";
import { runSearch, type AgentDoc } from "../server/search/search-service";
import { SearchIndex } from "../server/search/index-builder";

// Rooms v3 §10.1 — search must fail closed to the active room. These exercise
// runSearch's room filter directly via the agents source (no page index
// needed for scope:"agents").

function sources(agents: AgentDoc[]) {
  return {
    pages: new SearchIndex(),
    agents: () => agents,
    tasks: () => [],
    indexReady: () => true,
  };
}

const AGENTS: AgentDoc[] = [
  { slug: "a", title: "alpha widget", cabinet: "roomA", searchText: "alpha widget specialist" },
  { slug: "b", title: "beta widget", cabinet: "roomB", searchText: "beta widget specialist" },
];

test("search scoped to a room returns only that room's results", () => {
  const r = runSearch(sources(AGENTS), "widget", "agents", 50, "roomA");
  assert.deepEqual(r.agents.map((a) => a.slug), ["a"]);
});

test("search from room A never returns room B", () => {
  const r = runSearch(sources(AGENTS), "widget", "agents", 50, "roomB");
  assert.deepEqual(r.agents.map((a) => a.slug), ["b"]);
});

test("fails closed when no room is resolved (no cross-room leak)", () => {
  const r = runSearch(sources(AGENTS), "widget", "agents", 50, undefined);
  assert.deepEqual(r.agents, []);
  // The home/neutral scope (".") must also yield nothing, not everything.
  const home = runSearch(sources(AGENTS), "widget", "agents", 50, ".");
  assert.deepEqual(home.agents, []);
});

test("explicit includeOtherRooms returns results across rooms", () => {
  const r = runSearch(sources(AGENTS), "widget", "agents", 50, undefined, true);
  assert.deepEqual(r.agents.map((a) => a.slug).sort(), ["a", "b"]);
});

test("nested cabinets within a room stay visible; siblings do not", () => {
  const nested: AgentDoc[] = [
    { slug: "n", title: "widget agent", cabinet: "roomA/projects/acme", searchText: "widget agent" },
    { slug: "s", title: "widget agent", cabinet: "roomB", searchText: "widget agent" },
  ];
  const r = runSearch(sources(nested), "widget", "agents", 50, "roomA");
  assert.deepEqual(r.agents.map((a) => a.slug), ["n"]);
});
