import {
  deleteConversation,
  readConversationDetail,
} from "@/lib/agents/runtime/conversation-store";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return createGetHandler({
    handler: async () => {
      const detail = await readConversationDetail(id);

      if (!detail) {
        throw new HttpError(404, "Conversation not found");
      }

      return detail;
    },
  })(req);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return createHandler<void, { ok: true }>({
    handler: async () => {
      const deleted = await deleteConversation(id);

      if (!deleted) {
        throw new HttpError(404, "Conversation not found");
      }

      return { ok: true };
    },
  })(req);
}
