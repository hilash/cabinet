import test from "node:test";
import assert from "node:assert/strict";
import {
  findOptaleProductTool,
  isProductFacingToolName,
  listOptaleProductTools,
  optaleToolNameAllowedByList,
  productFacingToolName,
  resolveOptaleToolName,
  toProductFacingTool,
  toProductFacingToolOrNull,
} from "./tool-registry";

test("Tool Registry defines the product alias for qmd knowledge search", () => {
  const [tool] = listOptaleProductTools();

  assert.equal(tool?.productName, "sense_search_knowledge");
  assert.equal(tool?.productLabel, "Docs / Knowledge Search");
  assert.equal(tool?.executionConfig.internalTarget, "qmd__query");
  assert.equal(
    findOptaleProductTool("qmd__query")?.productName,
    "sense_search_knowledge",
  );
});

test("resolveOptaleToolName maps product and internal names to the same target", () => {
  assert.deepEqual(resolveOptaleToolName("sense_search_knowledge"), {
    requestedToolName: "sense_search_knowledge",
    internalToolName: "qmd__query",
    internalServerId: "qmd",
    productToolName: "sense_search_knowledge",
    productToolLabel: "Docs / Knowledge Search",
    productDescription:
      "Search Optale knowledge sources for relevant notes, docs, and source artifacts.",
  });

  assert.deepEqual(resolveOptaleToolName("qmd__query"), {
    requestedToolName: "qmd__query",
    internalToolName: "qmd__query",
    internalServerId: "qmd",
    productToolName: "sense_search_knowledge",
    productToolLabel: "Docs / Knowledge Search",
    productDescription:
      "Search Optale knowledge sources for relevant notes, docs, and source artifacts.",
  });
});

test("allowed tool lists accept either product aliases or internal bridge names", () => {
  assert.equal(
    optaleToolNameAllowedByList("qmd__query", ["sense_search_knowledge"]),
    true,
  );
  assert.equal(
    optaleToolNameAllowedByList("sense_search_knowledge", ["qmd__query"]),
    true,
  );
  assert.equal(
    optaleToolNameAllowedByList("qmd__status", ["sense_search_knowledge"]),
    false,
  );
});

test("toProductFacingTool hides internal bridge names from exposed tool definitions", () => {
  const exposed = toProductFacingTool({
    name: "qmd__query",
    description: "[qmd] search vault",
    inputSchema: { type: "object" },
  });

  assert.equal(exposed.name, "sense_search_knowledge");
  assert.equal(
    exposed.description,
    "Search Optale knowledge sources for relevant notes, docs, and source artifacts.",
  );
  assert.deepEqual(exposed.inputSchema, { type: "object" });
});

test("product-facing helpers hide unaliased internal MCP names", () => {
  assert.equal(productFacingToolName("qmd__query"), "sense_search_knowledge");
  assert.equal(
    productFacingToolName("sense_search_knowledge"),
    "sense_search_knowledge",
  );
  assert.equal(productFacingToolName("qmd__status"), null);
  assert.equal(isProductFacingToolName("sense_search_knowledge"), true);
  assert.equal(isProductFacingToolName("qmd__query"), false);

  assert.deepEqual(
    toProductFacingToolOrNull({
      name: "qmd__status",
      description: "index status",
      inputSchema: { type: "object" },
    }),
    null,
  );
});
