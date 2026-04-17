import { JOB_LIBRARY_TEMPLATES } from "@/lib/jobs/job-library";
import { createGetHandler } from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async () => ({ templates: JOB_LIBRARY_TEMPLATES }),
});
