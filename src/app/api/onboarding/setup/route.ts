import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { createHandler, HttpError } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const LIBRARY_DIR = path.join(AGENTS_DIR, ".library");
const CONFIG_DIR = path.join(AGENTS_DIR, ".config");
const CHAT_DIR = path.join(DATA_DIR, ".chat");

interface OnboardingRequest {
  answers: {
    companyName: string;
    description: string;
    goals: string;
    teamSize: string;
    priority: string;
  };
  selectedAgents: string[];
}

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = (await req.json()) as OnboardingRequest;
    const { answers, selectedAgents } = body;

    if (!Array.isArray(selectedAgents)) {
      throw new HttpError(400, "selectedAgents must be an array");
    }
    for (const slug of selectedAgents) {
      if (typeof slug !== "string") {
        throw new HttpError(400, "selectedAgents must contain strings");
      }
      assertValidSlug(slug, "selectedAgents");
    }

    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CONFIG_DIR, "company.json"),
      JSON.stringify(
        {
          exists: true,
          company: {
            name: answers.companyName,
            description: answers.description,
            goals: answers.goals,
            teamSize: answers.teamSize,
            priority: answers.priority,
          },
          setupDate: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    await fs.writeFile(
      path.join(CONFIG_DIR, "onboarding-complete.json"),
      JSON.stringify({ completed: true, date: new Date().toISOString() }),
    );

    await fs
      .writeFile(
        path.join(CONFIG_DIR, "../.config.json"),
        JSON.stringify({ exists: true }),
      )
      .catch(() => {});

    for (const slug of selectedAgents) {
      const templateDir = path.join(LIBRARY_DIR, slug);
      const targetDir = path.join(AGENTS_DIR, slug);

      try {
        await fs.access(templateDir);
      } catch {
        continue;
      }

      try {
        await fs.access(targetDir);
        continue;
      } catch {
        // Good, doesn't exist
      }

      await copyDir(templateDir, targetDir);

      for (const subdir of ["jobs", "skills", "sessions", "memory"]) {
        await fs.mkdir(path.join(targetDir, subdir), { recursive: true });
      }

      const personaPath = path.join(targetDir, "persona.md");
      try {
        const raw = await fs.readFile(personaPath, "utf-8");
        const injected = raw
          .replace(/\{\{company_name\}\}/g, answers.companyName)
          .replace(/\{\{company_description\}\}/g, answers.description)
          .replace(
            /\{\{goals\}\}/g,
            answers.goals || answers.priority || "",
          );
        await fs.writeFile(personaPath, injected);
      } catch {
        // Ignore injection errors
      }
    }

    await fs.mkdir(CHAT_DIR, { recursive: true });

    const channelMembers = new Map<string, Set<string>>();
    channelMembers.set("general", new Set(selectedAgents));

    for (const slug of selectedAgents) {
      try {
        const personaPath = path.join(AGENTS_DIR, slug, "persona.md");
        const raw = await fs.readFile(personaPath, "utf-8");
        const { data } = matter(raw);
        const agentChannels = (data.channels as string[]) || [];
        for (const ch of agentChannels) {
          if (!channelMembers.has(ch)) {
            channelMembers.set(ch, new Set());
          }
          channelMembers.get(ch)!.add(slug);
        }
        if (data.type === "lead") {
          for (const [, members] of channelMembers) {
            members.add(slug);
          }
        }
      } catch {
        // Skip
      }
    }

    const channelDescriptions: Record<string, string> = {
      general: "Company-wide announcements and discussion",
      leadership: "Strategic planning and goal setting",
      marketing: "Marketing campaigns, content, and SEO",
      content: "Content creation, editing, and review",
      sales: "Lead generation, outreach, and deals",
      engineering: "Technical work and code quality",
    };

    const channels = Array.from(channelMembers.entries()).map(
      ([slug, members]) => ({
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        members: Array.from(members),
        description: channelDescriptions[slug] || `${slug} team channel`,
      }),
    );

    await fs.writeFile(
      path.join(CHAT_DIR, "channels.json"),
      JSON.stringify(channels, null, 2),
    );

    for (const ch of channels) {
      assertValidSlug(ch.slug, "channel");
      const chDir = path.join(CHAT_DIR, ch.slug);
      await fs.mkdir(chDir, { recursive: true });
      const msgPath = path.join(chDir, "messages.md");
      const pinPath = path.join(chDir, "pins.json");
      await fs.writeFile(msgPath, "", { flag: "wx" }).catch(() => {});
      await fs
        .writeFile(pinPath, JSON.stringify([]), { flag: "wx" })
        .catch(() => {});
    }

    return { ok: true };
  },
});

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
