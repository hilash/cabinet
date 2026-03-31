import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const KB_PASSWORD = process.env.KB_PASSWORD || "";
const AUTH_ENABLED = KB_PASSWORD.length > 0;

async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "cabinet-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  if (!AUTH_ENABLED) {
    return NextResponse.json({ authenticated: true, authEnabled: false });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("kb-auth")?.value;
  const expected = await hashToken(KB_PASSWORD);
  const authenticated = token === expected;

  return NextResponse.json({ authenticated, authEnabled: true });
}
