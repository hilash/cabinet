import test from "node:test";
import assert from "node:assert/strict";
import { createOutputBuffer, pushOutput, joinOutput } from "./output-buffer";

test("output buffer accumulates within limit", () => {
  const buf = createOutputBuffer();
  pushOutput(buf, "hello", 1000);
  pushOutput(buf, " world", 1000);
  assert.equal(joinOutput(buf), "hello world");
  assert.equal(buf.bytes, Buffer.byteLength("hello world"));
});

test("output buffer evicts oldest chunks when over limit", () => {
  const buf = createOutputBuffer();
  const maxBytes = 100;

  // Push 60 bytes
  pushOutput(buf, "a".repeat(60), maxBytes);
  assert.equal(buf.bytes, 60);
  assert.equal(buf.chunks.length, 1);

  // Push 60 more — should evict first chunk
  pushOutput(buf, "b".repeat(60), maxBytes);
  assert.equal(buf.bytes, 60);
  assert.equal(buf.chunks.length, 1);
  assert.equal(joinOutput(buf), "b".repeat(60));
});

test("output buffer handles many small chunks then a large one", () => {
  const buf = createOutputBuffer();
  const maxBytes = 50;

  for (let i = 0; i < 10; i++) {
    pushOutput(buf, `chunk${i}`, maxBytes);
  }
  // Should have accumulated ~60 bytes of "chunk0..chunk9"
  // Last push would have evicted oldest
  assert.ok(buf.bytes <= maxBytes + 10); // allow for the last chunk slightly over

  // Push a chunk that's exactly maxBytes
  pushOutput(buf, "x".repeat(50), maxBytes);
  assert.equal(buf.chunks.length, 1);
  assert.equal(joinOutput(buf), "x".repeat(50));
  assert.equal(buf.bytes, 50);
});

test("output buffer handles empty string", () => {
  const buf = createOutputBuffer();
  pushOutput(buf, "", 100);
  assert.equal(buf.chunks.length, 1);
  assert.equal(joinOutput(buf), "");
  assert.equal(buf.bytes, 0);
});

test("output buffer handles multi-byte characters", () => {
  const buf = createOutputBuffer();
  const maxBytes = 10;

  // "你" is 3 bytes in UTF-8
  pushOutput(buf, "你好", maxBytes); // 6 bytes
  assert.equal(buf.bytes, 6);

  pushOutput(buf, "世界!", maxBytes); // 7 bytes — evicts first
  assert.equal(buf.chunks.length, 1);
  assert.equal(joinOutput(buf), "世界!");
});
