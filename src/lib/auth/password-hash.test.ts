import assert from "node:assert/strict";
import test, { mock } from "node:test";
import {
  hashPassword,
  passwordHashRuntime,
  verifyPassword,
} from "./password-hash";

test("hashPassword is stable for the same password and salt", async () => {
  const first = await hashPassword("testpw");
  const second = await hashPassword("testpw");

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("hashPassword changes when the password changes", async () => {
  const first = await hashPassword("testpw");
  const second = await hashPassword("differentpw");

  assert.notEqual(first, second);
});

test("verifyPassword accepts the matching password and rejects a different one", async () => {
  const expected = await hashPassword("testpw");

  assert.equal(await verifyPassword("testpw", expected), true);
  assert.equal(await verifyPassword("wrongpw", expected), false);
});

test("verifyPassword compares equal-length buffers with timingSafeEqual", async () => {
  const timingSafeEqual = mock.method(passwordHashRuntime, "timingSafeEqual", (left: Buffer, right: Buffer) => {
    assert.equal(left.length, 32);
    assert.equal(right.length, left.length);
    return false;
  });

  try {
    assert.equal(await verifyPassword("testpw", "not-hex"), false);
    assert.equal(timingSafeEqual.mock.calls.length, 1);
  } finally {
    timingSafeEqual.mock.restore();
  }
});
