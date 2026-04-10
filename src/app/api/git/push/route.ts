import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { gitPushWithToken } from "@/lib/git/git-service";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const db = getDb();
  const account = db
    .prepare(
      "SELECT accessToken FROM account WHERE userId = ? AND providerId = 'github'"
    )
    .get(session.user.id) as { accessToken: string | null } | undefined;

  if (!account?.accessToken) {
    return NextResponse.json({
      pushed: false,
      summary:
        "No GitHub account linked. Sign in with GitHub to enable push.",
    });
  }

  try {
    const result = await gitPushWithToken(account.accessToken);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ pushed: false, summary: message });
  }
}
