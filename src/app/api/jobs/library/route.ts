import { NextResponse } from "next/server";
import { JOB_LIBRARY_TEMPLATES } from "@/lib/jobs/job-library";
import { route } from "@/lib/runtime/route-wrapper";

export const GET = route(async () => {
  return NextResponse.json({ templates: JOB_LIBRARY_TEMPLATES });
});
