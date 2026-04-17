import { cookies } from "next/headers";
import {
  HttpError,
  createHandler,
} from "@/lib/http/create-handler";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password-hash";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;
const expectedPasswordHashPromise = AUTH_ENABLED ? hashPassword(KB_PASSWORD) : Promise.resolve("");

export const POST = createHandler({
  handler: async (_input, req) => {
    if (!AUTH_ENABLED) {
      return { ok: true };
    }

    const { password } = await req.json();
    const expectedPasswordHash = await expectedPasswordHashPromise;

    if (!(await verifyPassword(password, expectedPasswordHash))) {
      throw new HttpError(401, "Invalid password");
    }

    const cookieStore = await cookies();
    cookieStore.set("kb-auth", expectedPasswordHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.KB_ALLOW_HTTP !== "1",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return { ok: true };
  },
});
