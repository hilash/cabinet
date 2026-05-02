import test from "node:test";
import assert from "node:assert/strict";
import {
  readOptaleMcpServers,
  type OptaleMcpServerConfig,
} from "./context-registry";
import {
  parseEventStream,
  postDownstreamJsonRpc,
  resolveDownstreamHttpTimeoutMs,
} from "./mcp-downstream";

function testServer(
  overrides: Partial<OptaleMcpServerConfig> = {},
): OptaleMcpServerConfig {
  return {
    id: "qmd",
    name: "QMD",
    transport: "http",
    url: "http://example.test/mcp",
    timeoutMs: 120_000,
    scopes: ["system"],
    description: "test",
    status: "configured",
    ...overrides,
  };
}

function jsonRpcResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("parseEventStream returns the final parseable SSE payload", () => {
  const parsed = parseEventStream(
    [
      'event: message\ndata: {"jsonrpc":"2.0","method":"progress","params":{"step":1}}',
      'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"final"}]}}',
      "data: [DONE]",
    ].join("\n\n"),
  );

  assert.deepEqual(parsed, {
    jsonrpc: "2.0",
    id: 2,
    result: {
      content: [{ type: "text", text: "final" }],
    },
  });
});

test("qmd uses the longer downstream timeout by default", (t) => {
  const originalQmdTimeout = process.env.OPTALE_MCP_QMD_TIMEOUT_MS;
  const originalGraphitiTimeout = process.env.OPTALE_MCP_GRAPHITI_TIMEOUT_MS;
  delete process.env.OPTALE_MCP_QMD_TIMEOUT_MS;
  delete process.env.OPTALE_MCP_GRAPHITI_TIMEOUT_MS;
  t.after(() => {
    if (originalQmdTimeout === undefined) {
      delete process.env.OPTALE_MCP_QMD_TIMEOUT_MS;
    } else {
      process.env.OPTALE_MCP_QMD_TIMEOUT_MS = originalQmdTimeout;
    }
    if (originalGraphitiTimeout === undefined) {
      delete process.env.OPTALE_MCP_GRAPHITI_TIMEOUT_MS;
    } else {
      process.env.OPTALE_MCP_GRAPHITI_TIMEOUT_MS = originalGraphitiTimeout;
    }
  });

  const servers = readOptaleMcpServers();
  const qmd = servers.find((server) => server.id === "qmd");
  const graphiti = servers.find((server) => server.id === "graphiti");

  assert.equal(qmd?.timeoutMs, 120_000);
  assert.equal(qmd ? resolveDownstreamHttpTimeoutMs(qmd) : null, 120_000);
  assert.equal(
    graphiti ? resolveDownstreamHttpTimeoutMs(graphiti) : null,
    4_000,
  );
});

test("delayed qmd response below its timeout succeeds", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal((init?.signal as AbortSignal | undefined)?.aborted, false);
    return jsonRpcResponse({
      jsonrpc: "2.0",
      id: 2,
      result: { content: [{ type: "text", text: "qmd result" }] },
    });
  }) as typeof fetch;

  const result = await postDownstreamJsonRpc(
    testServer({ timeoutMs: 120_000 }),
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "query", arguments: { searches: [] } },
    },
  );

  assert.deepEqual(result.body, {
    jsonrpc: "2.0",
    id: 2,
    result: { content: [{ type: "text", text: "qmd result" }] },
  });
});

test("downstream timeout reports an explicit server timeout error", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () =>
          reject(new DOMException("This operation was aborted", "AbortError")),
        { once: true },
      );
    });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      postDownstreamJsonRpc(testServer({ id: "qmd", timeoutMs: 10 }), {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "query", arguments: { searches: [] } },
      }),
    /Downstream MCP server qmd tools\/call timed out after 10ms/,
  );
});

test("non-qmd downstream servers remain bounded by the default timeout", () => {
  assert.equal(
    resolveDownstreamHttpTimeoutMs(
      testServer({
        id: "graphiti",
        timeoutMs: undefined,
      }),
    ),
    4_000,
  );
});
