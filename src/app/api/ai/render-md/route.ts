import { NextRequest, NextResponse } from "next/server";
import { markdownToHtml } from "@/lib/markdown/to-html";

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();
    if (!markdown) return NextResponse.json({ html: "" });
    const html = await markdownToHtml(markdown);
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ html: "" }, { status: 500 });
  }
}
