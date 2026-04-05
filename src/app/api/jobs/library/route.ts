import { NextResponse } from "next/server";
import { JOB_LIBRARY_TEMPLATES } from "@/lib/jobs/job-library";

export async function GET() {
  return NextResponse.json({ templates: JOB_LIBRARY_TEMPLATES });
}
