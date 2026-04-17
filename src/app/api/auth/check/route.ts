import { cookies } from "next/headers";
import { createGetHandler } from "@/lib/http/create-handler";
import { verifyPassword } from "@/lib/auth/password-hash";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;

export const GET = createGetHandler({
  handler: async () => {
    if (!AUTH_ENABLED) {
      return { authenticated: true, authEnabled: false };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("kb-auth")?.value;
    const authenticated = token ? await verifyPassword(KB_PASSWORD, token) : false;

    return { authenticated, authEnabled: true };
  },
});
