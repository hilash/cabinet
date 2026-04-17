import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "./create-handler";

test("createHandler returns 200 for valid input", async () => {
  const handler = createHandler({
    input: z.object({
      name: z.string(),
    }),
    handler: async (input) => ({ greeting: `hello ${input.name}` }),
  });

  const response = await handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "Ada" }),
      headers: {
        "content-type": "application/json",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { greeting: "hello Ada" });
});

test("createHandler returns 400 with zod issues for invalid input", async () => {
  const handler = createHandler({
    input: z.object({
      count: z.number().int().positive(),
    }),
    handler: async (input) => ({ count: input.count }),
  });

  const response = await handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ count: "oops" }),
      headers: {
        "content-type": "application/json",
      },
    })
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "invalid_input");
  assert.ok(Array.isArray(body.issues));
  assert.equal(body.issues[0]?.path?.[0], "count");
});

test("createHandler maps HttpError to its status and message", async () => {
  const handler = createHandler({
    input: z.object({
      id: z.string(),
    }),
    handler: async () => {
      throw new HttpError(404, "Not found");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ id: "abc" }),
      headers: {
        "content-type": "application/json",
      },
    })
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not found" });
});

test("createHandler returns internal_error for unknown exceptions", async () => {
  const handler = createHandler({
    input: z.object({
      id: z.string(),
    }),
    handler: async () => {
      throw new Error("boom");
    },
  });

  const response = await handler(
    new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ id: "abc" }),
      headers: {
        "content-type": "application/json",
      },
    })
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "internal_error",
    message: "boom",
  });
});

test("createGetHandler skips body parsing and returns 200", async () => {
  const handler = createGetHandler({
    handler: async (req) => ({ path: new URL(req.url).pathname }),
  });

  const response = await handler(
    new Request("http://localhost/api/test?foo=bar", {
      method: "GET",
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { path: "/api/test" });
});
