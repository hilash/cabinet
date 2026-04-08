import test from "node:test";
import assert from "node:assert/strict";
import {
  getSession,
  installAgentRunStarterForTests,
  resetAgentManagerForTests,
  runAgent,
  stopAgent,
} from "./agent-manager";
import type { ProviderPromptRun } from "./provider-runtime";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("stopAgent cancels an in-flight run and preserves the stopped state", async (t) => {
  resetAgentManagerForTests();
  t.after(() => resetAgentManagerForTests());

  const deferred = createDeferred<string>();
  let cancelCalls = 0;

  installAgentRunStarterForTests((): ProviderPromptRun => ({
    result: deferred.promise,
    cancel() {
      cancelCalls += 1;
    },
  }));

  const id = await runAgent("Manual agent run", "Say hello");

  assert.equal(stopAgent(id), true);
  assert.equal(cancelCalls, 1);

  const stoppedSession = getSession(id);
  assert.equal(stoppedSession?.status, "failed");
  assert.ok(stoppedSession?.completedAt);

  deferred.resolve("late success");
  await flushMicrotasks();

  const sessionAfterLateCompletion = getSession(id);
  assert.equal(sessionAfterLateCompletion?.status, "failed");
  assert.equal(sessionAfterLateCompletion?.output, "");
});

test("runAgent marks a session completed when the run resolves normally", async (t) => {
  resetAgentManagerForTests();
  t.after(() => resetAgentManagerForTests());

  installAgentRunStarterForTests((): ProviderPromptRun => ({
    result: Promise.resolve("done"),
    cancel() {},
  }));

  const id = await runAgent("Manual agent run", "Say hello");
  await flushMicrotasks();

  const session = getSession(id);
  assert.equal(session?.status, "completed");
  assert.equal(session?.output, "done");
  assert.ok(session?.completedAt);
});
