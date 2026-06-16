import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  KB_AUTH_COOKIE,
  expectedToken,
  isAuthEnabled,
  timingSafeEqualHex,
} from "@/lib/auth/kb-auth";

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ authenticated: true, authEnabled: false });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(KB_AUTH_COOKIE)?.value ?? "";
  const authenticated = timingSafeEqualHex(token, await expectedToken());

  return NextResponse.json({ authenticated, authEnabled: true });
}
