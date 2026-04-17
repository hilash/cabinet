import { cookies } from "next/headers";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const POST = createHandler({
  handler: async (_input, req) => {
    if (!AUTH_ENABLED) {
      return { ok: true };
    }

    const { password } = await req.json();

    if (password !== KB_PASSWORD) {
      throw new HttpError(401, "Invalid password");
    }

    const token = await hashToken(password);
    const cookieStore = await cookies();
    cookieStore.set("kb-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return { ok: true };
  },
});
