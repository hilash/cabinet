import {
  listChannels,
  createChannel,
  getLatestMessageTime,
} from "@/lib/chat/chat-io";
import {
  createGetHandler,
  createHandler,
  HttpError,
} from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async () => {
    const channels = await listChannels();
    const enriched = channels.map((ch) => ({
      ...ch,
      lastMessageAt: getLatestMessageTime(ch.slug),
    }));
    return { channels: enriched };
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    const { slug, name, members, description } = body;

    if (!slug || !name) {
      throw new HttpError(400, "slug and name are required");
    }

    try {
      await createChannel({ slug, name, members: members || [], description });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("already exists") ? 409 : 500;
      throw new HttpError(status, message);
    }

    return { ok: true };
  },
});
