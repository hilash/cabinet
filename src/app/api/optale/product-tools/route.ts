import { NextResponse } from "next/server";
import { listOptaleProductTools } from "@/lib/optale/tool-registry";

export async function GET() {
  const tools = listOptaleProductTools()
    .filter((tool) => tool.status === "active")
    .map((tool) => ({
      name: tool.productName,
      label: tool.productLabel,
      description: tool.description,
      category: tool.category,
      tags: tool.tags,
      status: tool.status,
    }));

  return NextResponse.json({ tools });
}
