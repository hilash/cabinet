import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/gmail/smtp-client";

export async function POST(request: NextRequest) {
  try {
    // Verify connected
    const db = getDb();
    const row = db
      .prepare("SELECT email FROM gmail_credentials WHERE id = 'default'")
      .get() as { email: string } | undefined;
    if (!row) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const body = await request.json() as {
      to: string | string[];
      subject: string;
      body: string;
      replyToMessageId?: string;
    };

    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }

    const result = await sendEmail({
      to: body.to,
      subject: body.subject,
      body: body.body,
      replyToMessageId: body.replyToMessageId,
    });

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
