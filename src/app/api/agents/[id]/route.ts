import { getSession, stopAgent } from "@/lib/agents/runtime/agent-manager";
import {
  HttpError,
  createGetHandler,
  createHandler,
} from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

type RouteParams = { params: Promise<{ id: string }> };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  return createGetHandler({
    handler: async () => {
      try {
        assertValidSlug(id, "id");
        const session = getSession(id);
        if (!session) {
          throw new HttpError(404, "Session not found");
        }

        return session;
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params;
  return createHandler<void, { ok: true; stopped: boolean }>({
    handler: async () => {
      try {
        assertValidSlug(id, "id");
        const stopped = stopAgent(id);
        return { ok: true, stopped };
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError(500, getErrorMessage(error));
      }
    },
  })(req);
}
