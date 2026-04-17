import assert from "node:assert/strict";
import test from "node:test";
import { hasSecret, redactSecrets, restoreRedactedSecrets } from "./redact";

function makeConfig() {
  return {
    mcp_servers: {
      reddit: {
        name: "Reddit",
        command: "reddit",
        enabled: true,
        env: {
          REDDIT_CLIENT_ID: "public-client-id",
          REDDIT_CLIENT_SECRET: "reddit-secret-5678",
        },
      },
      linkedin: {
        name: "LinkedIn",
        command: "linkedin",
        enabled: true,
        env: {
          LINKEDIN_ACCESS_TOKEN: "linkedin-token-1234",
        },
      },
      github: {
        name: "GitHub",
        command: "github",
        enabled: true,
        env: {
          GITHUB_TOKEN: "ghp_token_8a2f",
        },
      },
      slack: {
        name: "Slack",
        command: "slack",
        enabled: true,
        env: {
          SLACK_BOT_TOKEN: "xoxb-slack-4444",
        },
      },
      email: {
        name: "Email",
        command: "email",
        enabled: true,
        env: {
          SMTP_HOST: "smtp.example.com",
          SMTP_USER: "mailer@example.com",
          SMTP_PASS: "smtp-pass-6789",
        },
      },
      gsheets: {
        name: "Google Sheets",
        command: "gsheets",
        enabled: true,
        env: {
          GOOGLE_CREDENTIALS: "{\"private_key\":\"abcd1234\"}",
        },
      },
    },
    notifications: {
      browser_push: true,
      telegram: {
        enabled: true,
        bot_token: "telegram-token-9999",
        chat_id: "chat-123",
      },
      slack_webhook: {
        enabled: true,
        url: "https://hooks.slack.test/services/secret9876",
      },
      email: {
        enabled: false,
        frequency: "daily" as const,
        to: "alerts@example.com",
        smtp_password: "notif-pass-1111",
        smtp_user: "notify@example.com",
      },
    },
  };
}

test("redactSecrets masks known secret fields and preserves non-secret values", () => {
  const config = makeConfig();

  const redacted = redactSecrets(config);

  assert.equal(redacted.notifications.telegram.bot_token, "***9999");
  assert.equal(redacted.notifications.slack_webhook.url, "***9876");
  assert.equal(redacted.notifications.email.smtp_password, "***1111");
  assert.equal(redacted.notifications.email.smtp_user, "***.com");
  assert.equal(redacted.mcp_servers.reddit.env.REDDIT_CLIENT_SECRET, "***5678");
  assert.equal(redacted.mcp_servers.linkedin.env.LINKEDIN_ACCESS_TOKEN, "***1234");
  assert.equal(redacted.mcp_servers.github.env.GITHUB_TOKEN, "***8a2f");
  assert.equal(redacted.mcp_servers.slack.env.SLACK_BOT_TOKEN, "***4444");
  assert.equal(redacted.mcp_servers.email.env.SMTP_USER, "***.com");
  assert.equal(redacted.mcp_servers.email.env.SMTP_PASS, "***6789");
  assert.equal(redacted.mcp_servers.gsheets.env.GOOGLE_CREDENTIALS, "***34\"}");

  assert.equal(redacted.notifications.telegram.chat_id, "chat-123");
  assert.equal(redacted.notifications.email.to, "alerts@example.com");
  assert.equal(redacted.mcp_servers.reddit.env.REDDIT_CLIENT_ID, "public-client-id");
  assert.equal(redacted.mcp_servers.email.env.SMTP_HOST, "smtp.example.com");

  assert.equal(config.notifications.telegram.bot_token, "telegram-token-9999");
  assert.equal(config.mcp_servers.github.env.GITHUB_TOKEN, "ghp_token_8a2f");
});

test("redactSecrets normalizes empty, undefined, and null secret values to empty strings", () => {
  const config = {
    mcp_servers: {
      slack: {
        env: {
          SLACK_BOT_TOKEN: null,
        },
      },
      email: {
        env: {
          SMTP_USER: undefined,
          SMTP_PASS: "",
        },
      },
    },
    notifications: {
      telegram: {
        bot_token: undefined,
      },
      email: {
        smtp_password: null,
        smtp_user: "",
      },
    },
  };

  const redacted = redactSecrets(config);

  assert.equal(redacted.notifications.telegram.bot_token, "");
  assert.equal(redacted.notifications.email.smtp_password, "");
  assert.equal(redacted.notifications.email.smtp_user, "");
  assert.equal(redacted.mcp_servers.slack.env.SLACK_BOT_TOKEN, "");
  assert.equal(redacted.mcp_servers.email.env.SMTP_USER, "");
  assert.equal(redacted.mcp_servers.email.env.SMTP_PASS, "");
});

test("hasSecret reports whether a secret field has a non-empty value", () => {
  const config = makeConfig();
  const redacted = redactSecrets(config);

  assert.equal(hasSecret(config, "notifications.telegram.bot_token"), true);
  assert.equal(hasSecret(config, "notifications.slack_webhook.url"), true);
  assert.equal(hasSecret(config, "notifications.telegram.chat_id"), true);
  assert.equal(hasSecret(config, "mcp_servers.reddit.env.REDDIT_CLIENT_SECRET"), true);
  assert.equal(hasSecret(config, "mcp_servers.email.env.SMTP_PASS"), true);
  assert.equal(hasSecret({ notifications: { telegram: { bot_token: "" } } }, "notifications.telegram.bot_token"), false);
  assert.equal(hasSecret({ notifications: { telegram: { bot_token: null } } }, "notifications.telegram.bot_token"), false);
  assert.equal(hasSecret({ notifications: { telegram: {} } }, "notifications.telegram.bot_token"), false);
  assert.equal(hasSecret(redacted, "notifications.telegram.bot_token"), true);
});

test("restoreRedactedSecrets preserves original secrets when UI submits masked or empty values", () => {
  const currentConfig = makeConfig();
  const roundTrippedConfig = redactSecrets(currentConfig);

  roundTrippedConfig.notifications.telegram.enabled = false;
  roundTrippedConfig.notifications.slack_webhook.url = "";
  roundTrippedConfig.mcp_servers.github.env.GITHUB_TOKEN = "***8a2f***";
  roundTrippedConfig.mcp_servers.email.env.SMTP_HOST = "smtp.internal.example.com";

  const restored = restoreRedactedSecrets(currentConfig, roundTrippedConfig);

  assert.equal(restored.notifications.telegram.enabled, false);
  assert.equal(restored.notifications.telegram.bot_token, "telegram-token-9999");
  assert.equal(restored.notifications.slack_webhook.url, "https://hooks.slack.test/services/secret9876");
  assert.equal(restored.mcp_servers.github.env.GITHUB_TOKEN, "ghp_token_8a2f");
  assert.equal(restored.mcp_servers.email.env.SMTP_HOST, "smtp.internal.example.com");
  assert.equal(restored.mcp_servers.email.env.SMTP_PASS, "smtp-pass-6789");
});
