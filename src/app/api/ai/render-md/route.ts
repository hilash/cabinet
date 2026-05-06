import { NextRequest, NextResponse } from "next/server";
import { markdownToHtml } from "@/lib/markdown/to-html";
import { route } from "@/lib/runtime/route-wrapper";

export const POST = route(async (req: NextRequest) => {
  try {
    const { markdown } = await req.json();
    if (!markdown) return NextResponse.json({ html: "" });
    const html = await markdownToHtml(markdown);
    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json({ html: "" }, { status: 500 });
  }
});
