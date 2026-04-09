import { betterAuth } from "better-auth";
import { getDb } from "@/lib/db";

export const auth = betterAuth({
  database: getDb(),
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(process.env.GITHUB_CLIENT_ID && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await maybeCreateDefaultTeam(user.id);
        },
      },
    },
  },
});

async function maybeCreateDefaultTeam(userId: string): Promise<void> {
  const db = getDb();

  const teamCount = (
    db.prepare("SELECT COUNT(*) as c FROM teams").get() as { c: number }
  ).c;
  if (teamCount > 0) return;

  const { getManagedDataDir } = await import("@/lib/runtime/runtime-config");
  const { existsSync, readdirSync } = await import("fs");
  const dataDir = getManagedDataDir();

  const hasContent =
    existsSync(dataDir) &&
    readdirSync(dataDir).some((f) => !f.startsWith(".") && f !== "teams");

  const teamId = crypto.randomUUID();
  const slug = "default";

  if (hasContent) {
    db.prepare(`
      INSERT INTO teams (id, name, slug, data_dir_override, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(teamId, "Default", slug, dataDir, userId);
  } else {
    db.prepare(`
      INSERT INTO teams (id, name, slug, created_by)
      VALUES (?, ?, ?, ?)
    `).run(teamId, "Default", slug, userId);
  }

  db.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role)
    VALUES (?, ?, ?, 'admin')
  `).run(crypto.randomUUID(), teamId, userId);
}
