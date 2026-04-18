import { readCompany, writeCompany } from "@/lib/agents/company";
import { createGetHandler, createHandler } from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async () => readCompany(),
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    await writeCompany(body);
    return { ok: true };
  },
});
