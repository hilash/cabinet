import { createHandler, HttpError } from "@/lib/http/create-handler";
import {
  runOnboarding,
  type OnboardingRequest,
} from "@/lib/agents/onboarding";

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = (await req.json()) as OnboardingRequest;

    if (!Array.isArray(body.selectedAgents)) {
      throw new HttpError(400, "selectedAgents must be an array");
    }
    for (const slug of body.selectedAgents) {
      if (typeof slug !== "string") {
        throw new HttpError(400, "selectedAgents must contain strings");
      }
    }

    await runOnboarding(body);
    return { ok: true };
  },
});
