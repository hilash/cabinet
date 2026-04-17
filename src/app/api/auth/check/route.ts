import { cookies } from "next/headers";
import { createGetHandler } from "@/lib/http/create-handler";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const GET = createGetHandler({
  handler: async () => {
    if (!AUTH_ENABLED) {
      return { authenticated: true, authEnabled: false };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("kb-auth")?.value;
    const expected = await hashToken(KB_PASSWORD);
    const authenticated = token === expected;

    return { authenticated, authEnabled: true };
  },
});
