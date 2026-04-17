import assert from "node:assert/strict";
import test from "node:test";
import { daemonBus } from "./daemon-bus";

test.afterEach(() => {
  daemonBus.removeAllListeners();
});

test("daemonBus.request resolves from a typed PTY ack event", async () => {
  let createdEventRequestId = "";

  daemonBus.once("pty:create-request", (request) => {
    const response = {
      requestId: request.requestId,
      sessionId: request.id || "session-1",
      pid: 4242,
    };

    daemonBus.emit("pty:created", response);
    daemonBus.emit(request.replyTo, response);
  });

  daemonBus.once("pty:created", (event) => {
    createdEventRequestId = event.requestId;
  });

  const response = await daemonBus.request(
    "pty:create-request",
    {
      id: "session-1",
      prompt: "hello",
    },
    {
      timeoutMs: 100,
    },
  );

  assert.equal(response.sessionId, "session-1");
  assert.equal(response.pid, 4242);
  assert.equal(response.requestId, createdEventRequestId);
});

test("daemonBus.request times out when a PTY handler never acks", async () => {
  daemonBus.once("pty:create-request", () => {
    // Intentionally do not emit the ack event.
  });

  await assert.rejects(
    daemonBus.request(
      "pty:create-request",
      {
        id: "session-timeout",
      },
      {
        timeoutMs: 10,
      },
    ),
    /daemonBus request timed out for pty:create-request after 10ms/,
  );
});
