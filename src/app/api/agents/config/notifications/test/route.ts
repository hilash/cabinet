import { createHandler } from "@/lib/http/create-handler";
import { sendNotification } from "@/lib/agents/runtime/notification-service";

export const POST = createHandler({
  handler: async () => {
    const result = await sendNotification({
      title: "Cabinet Test Notification",
      message: "If you see this, your notification setup is working correctly!",
      agentName: "Cabinet System",
      agentEmoji: "\u{2705}",
      channel: "test",
      severity: "info",
    });

    if (result.sent.length === 0) {
      return {
        ok: false,
        message: "No notification channels are configured or enabled. Check Settings > Notifications.",
      };
    }

    return {
      ok: true,
      sent: result.sent,
      message: `Test notification sent via: ${result.sent.join(", ")}`,
    };
  },
});
