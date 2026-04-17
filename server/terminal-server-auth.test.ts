import assert from "node:assert/strict";
import test from "node:test";
import { getOrCreateDaemonTokenSync } from "../src/lib/agents/runtime/daemon-auth";
import {
  requireTerminalServerHttpAuth,
  requireTerminalServerWebSocketAuth,
} from "./terminal-server-auth";

const originalDaemonToken = process.env.CABINET_DAEMON_TOKEN;
process.env.CABINET_DAEMON_TOKEN = "terminal-server-test-token";
const daemonToken = getOrCreateDaemonTokenSync();

test.after(() => {
  if (originalDaemonToken === undefined) {
    delete process.env.CABINET_DAEMON_TOKEN;
    return;
  }

  process.env.CABINET_DAEMON_TOKEN = originalDaemonToken;
});

function createResponseRecorder() {
  return {
    statusCode: null as number | null,
    headers: null as Record<string, string> | null,
    body: "",
    writeHead(statusCode: number, headers?: Record<string, string>) {
      this.statusCode = statusCode;
      this.headers = headers ?? null;
      return this;
    },
    end(body?: string) {
      this.body = body ?? "";
    },
  };
}

test("terminal server HTTP routes reject requests without a daemon token", async () => {
  const response = createResponseRecorder();
  const allowed = requireTerminalServerHttpAuth(
    { headers: {} },
    response,
    new URL("http://127.0.0.1/session/test/output"),
  );

  assert.equal(allowed, false);
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.headers, { "Content-Type": "application/json" });
  assert.equal(response.body, JSON.stringify({ error: "Unauthorized" }));
});

test("terminal server HTTP routes allow Bearer-authenticated requests", () => {
  const response = createResponseRecorder();
  const allowed = requireTerminalServerHttpAuth(
    {
      headers: {
        authorization: `Bearer ${daemonToken}`,
      },
    },
    response,
    new URL("http://127.0.0.1/session/test/output"),
  );

  assert.equal(allowed, true);
  assert.equal(response.statusCode, null);
  assert.equal(response.body, "");
});

test("terminal server WebSocket connections close with 1008 when token is missing", () => {
  const closeCalls: Array<{ code: number; reason: string }> = [];
  const allowed = requireTerminalServerWebSocketAuth(
    {
      close(code: number, reason: string) {
        closeCalls.push({ code, reason });
      },
    },
    { headers: {} },
    new URL("http://127.0.0.1/ws?id=missing-token"),
  );

  assert.equal(allowed, false);
  assert.deepEqual(closeCalls, [{ code: 1008, reason: "unauthorized" }]);
});

test("terminal server WebSocket connections allow valid daemon tokens", () => {
  let closeCalled = false;
  const allowed = requireTerminalServerWebSocketAuth(
    {
      close() {
        closeCalled = true;
      },
    },
    { headers: {} },
    new URL(`http://127.0.0.1/ws?id=authorized&token=${daemonToken}`),
  );

  assert.equal(allowed, true);
  assert.equal(closeCalled, false);
});
