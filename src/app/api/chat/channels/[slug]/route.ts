import { NextRequest } from "next/server";
import { getChannel, getMessages, postMessage, togglePin } from "@/lib/chat/chat-io";
import {
  createGetHandler,
  createHandler,
  HttpError,
} from "@/lib/http/create-handler";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createGetHandler({
    handler: async (r) => {
      const channel = await getChannel(slug);
      if (!channel) {
        throw new HttpError(404, "Channel not found");
      }

      const url = new URL(r.url);
      const limit = parseInt(url.searchParams.get("limit") || "100");
      const before = url.searchParams.get("before") || undefined;

      const messages = getMessages(slug, limit, before);
      return { channel, messages };
    },
  })(req);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  return createHandler({
    handler: async (_input, r) => {
      const body = await r.json();

      if (body.action === "pin" && body.messageId) {
        const pinned = togglePin(body.messageId);
        return { ok: true, pinned };
      }

      const { fromId, fromType, content, replyTo } = body;

      if (!fromId || !content) {
        throw new HttpError(400, "fromId and content are required");
      }

      const msg = postMessage(
        slug,
        fromId,
        fromType || "human",
        content,
        replyTo,
      );

      const mentions = (content.match(/@([a-z0-9-]+)/g) || []).map(
        (m: string) => m.slice(1),
      );

      return { message: msg, mentions };
    },
  })(req);
}
