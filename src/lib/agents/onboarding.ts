import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  copyDirectoryRecursive,
  ensureDirectory,
  fileExists,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";
import { writeCompany } from "@/lib/agents/company";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");
const LIBRARY_DIR = path.join(AGENTS_DIR, ".library");
const CONFIG_DIR = path.join(AGENTS_DIR, ".config");
const CHAT_DIR = path.join(DATA_DIR, ".chat");

export interface OnboardingAnswers {
  companyName: string;
  description: string;
  goals: string;
  teamSize: string;
  priority: string;
}

export interface OnboardingRequest {
  answers: OnboardingAnswers;
  selectedAgents: string[];
}

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  general: "Company-wide announcements and discussion",
  leadership: "Strategic planning and goal setting",
  marketing: "Marketing campaigns, content, and SEO",
  content: "Content creation, editing, and review",
  sales: "Lead generation, outreach, and deals",
  engineering: "Technical work and code quality",
};

async function writeOnboardingConfig(answers: OnboardingAnswers): Promise<void> {
  await writeCompany({
    exists: true,
    company: {
      name: answers.companyName,
      description: answers.description,
      goals: answers.goals,
      teamSize: answers.teamSize,
      priority: answers.priority,
    },
    setupDate: new Date().toISOString(),
  });

  await writeFileContent(
    path.join(CONFIG_DIR, "onboarding-complete.json"),
    JSON.stringify({ completed: true, date: new Date().toISOString() }),
  );

  await writeFileContent(
    path.join(DATA_DIR, ".agents", ".config.json"),
    JSON.stringify({ exists: true }),
  ).catch(() => {});
}

async function instantiateAgentFromOnboarding(
  slug: string,
  answers: OnboardingAnswers,
): Promise<boolean> {
  const templateDir = path.join(LIBRARY_DIR, slug);
  const targetDir = path.join(AGENTS_DIR, slug);

  if (!(await fileExists(templateDir))) return false;
  if (await fileExists(targetDir)) return false;

  await copyDirectoryRecursive(templateDir, targetDir);
  for (const subdir of ["jobs", "skills", "sessions", "memory"]) {
    await ensureDirectory(path.join(targetDir, subdir));
  }

  const personaPath = path.join(targetDir, "persona.md");
  try {
    const raw = await readFileContent(personaPath);
    const injected = raw
      .replace(/\{\{company_name\}\}/g, answers.companyName)
      .replace(/\{\{company_description\}\}/g, answers.description)
      .replace(/\{\{goals\}\}/g, answers.goals || answers.priority || "");
    await writeFileContent(personaPath, injected);
  } catch {
    // template missing persona.md — skip
  }
  return true;
}

async function buildChannelMembers(
  selectedAgents: string[],
): Promise<Map<string, Set<string>>> {
  const channelMembers = new Map<string, Set<string>>();
  channelMembers.set("general", new Set(selectedAgents));

  for (const slug of selectedAgents) {
    const personaPath = path.join(AGENTS_DIR, slug, "persona.md");
    try {
      const raw = await readFileContent(personaPath);
      const { data } = matter(raw);
      const agentChannels = (data.channels as string[]) || [];
      for (const ch of agentChannels) {
        if (!channelMembers.has(ch)) channelMembers.set(ch, new Set());
        channelMembers.get(ch)!.add(slug);
      }
      if (data.type === "lead") {
        for (const [, members] of channelMembers) {
          members.add(slug);
        }
      }
    } catch {
      // skip agents without parseable persona
    }
  }
  return channelMembers;
}

async function writeChannelScaffold(
  channelMembers: Map<string, Set<string>>,
): Promise<void> {
  const channels = Array.from(channelMembers.entries()).map(
    ([slug, members]) => ({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      members: Array.from(members),
      description: CHANNEL_DESCRIPTIONS[slug] || `${slug} team channel`,
    }),
  );

  await writeFileContent(
    path.join(CHAT_DIR, "channels.json"),
    JSON.stringify(channels, null, 2),
  );

  for (const ch of channels) {
    assertValidSlug(ch.slug, "channel");
    const chDir = path.join(CHAT_DIR, ch.slug);
    await ensureDirectory(chDir);
    await fs
      .writeFile(path.join(chDir, "messages.md"), "", { flag: "wx" })
      .catch(() => {});
    await fs
      .writeFile(path.join(chDir, "pins.json"), JSON.stringify([]), { flag: "wx" })
      .catch(() => {});
  }
}

export async function runOnboarding(request: OnboardingRequest): Promise<void> {
  const { answers, selectedAgents } = request;

  for (const slug of selectedAgents) {
    assertValidSlug(slug, "selectedAgents");
  }

  await writeOnboardingConfig(answers);

  for (const slug of selectedAgents) {
    await instantiateAgentFromOnboarding(slug, answers);
  }

  await ensureDirectory(CHAT_DIR);
  const channelMembers = await buildChannelMembers(selectedAgents);
  await writeChannelScaffold(channelMembers);
}
