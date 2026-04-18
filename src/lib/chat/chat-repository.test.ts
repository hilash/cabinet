import assert from "node:assert/strict";
import test from "node:test";
import {
  type Channel,
  type ChatMessage,
} from "./repository";
import { MemoryChannelRepository } from "./memory-repository";

function createRepository(): MemoryChannelRepository {
  return new MemoryChannelRepository();
}

// `createdAt` is a Date.now() ISO string and the "before" filter is strictly
// less-than. A 2ms delay is within Linux CI timer jitter — two adjacent ticks
// can collapse into the same millisecond and break pagination ordering.
// 10ms keeps tests fast while staying outside setTimeout drift.
function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
}

function createChannelInput(overrides: Partial<Channel> = {}): Channel {
  return {
    slug: "general",
    name: "General",
    members: ["ceo", "editor"],
    ...overrides,
  };
}

function postMessageInput(
  repository: MemoryChannelRepository,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return repository.postMessage(
    overrides.channelSlug ?? "general",
    overrides.fromId ?? "ceo",
    overrides.fromType ?? "agent",
    overrides.content ?? "Ship it",
    overrides.replyTo,
  );
}

test("memory channel repository creates channels and writes messages", async () => {
  const repository = createRepository();

  await repository.createChannel(createChannelInput({ description: "Main room" }));

  const created = postMessageInput(repository);

  assert.ok(created.id);
  assert.equal(created.channelSlug, "general");
  assert.equal(created.pinned, false);

  const channel = await repository.getChannel("general");
  assert.deepEqual(channel, {
    slug: "general",
    name: "General",
    members: ["ceo", "editor"],
    description: "Main room",
  });

  assert.deepEqual(repository.getMessages("general"), [created]);
});

test("memory channel repository lists channels and reads message history", async () => {
  const repository = createRepository();

  await repository.createChannel(createChannelInput({ members: ["ceo"] }));
  await repository.createChannel(
    createChannelInput({
      slug: "random",
      name: "Random",
      members: ["ceo", "ops"],
    }),
  );

  const first = postMessageInput(repository, { content: "First" });
  await waitForNextTick();
  const second = postMessageInput(repository, {
    fromId: "ops",
    fromType: "human",
    content: "Second",
  });
  await waitForNextTick();
  const third = postMessageInput(repository, {
    fromId: "system",
    fromType: "system",
    content: "Third",
  });

  const channels = await repository.listChannels();
  assert.deepEqual(
    channels.map((channel) => channel.slug),
    ["general", "random"],
  );

  assert.deepEqual(
    repository.getMessages("general", 2).map((message) => message.id),
    [second.id, third.id],
  );
  assert.deepEqual(
    repository.getMessages("general", 10, third.createdAt).map((message) => message.id),
    [first.id, second.id],
  );
});

test("memory channel repository updates channels and message metadata", async () => {
  const repository = createRepository();

  await repository.createChannel(createChannelInput({ members: ["ceo"] }));

  const updated = await repository.updateChannel("general", {
    name: "Announcements",
    members: ["ceo", "ops"],
    description: "Broadcasts only",
  });
  const created = postMessageInput(repository, { content: "Pinned update" });

  assert.deepEqual(updated, {
    slug: "general",
    name: "Announcements",
    members: ["ceo", "ops"],
    description: "Broadcasts only",
  });
  assert.equal(repository.getLatestMessageTime("general"), created.createdAt);
  assert.equal(repository.togglePin(created.id), true);
  assert.equal(repository.getMessages("general")[0]?.pinned, true);
  assert.equal(repository.togglePin(created.id), false);
  assert.equal(repository.getMessages("general")[0]?.pinned, false);
});
