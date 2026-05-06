import { NextRequest, NextResponse } from "next/server";
import path from "path";
import matter from "gray-matter";
import { getDataDir } from "@/lib/storage/path-utils";
import { scaffoldCabinet } from "@/lib/storage/cabinet-scaffold";
import {
  copyFile,
  ensureDirectory,
  fileExists,
  listDirectory,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import {
  getMandatoryAgentSlugs,
  mergeMandatoryAgentSlugs,
  resolveAgentLibraryDir,
} from "@/lib/agents/library-manager";
import { ensureAgentScaffold } from "@/lib/agents/scaffold";
import { getRoomConfig, type RoomType } from "@/lib/onboarding/rooms";
import { route } from "@/lib/runtime/route-wrapper";

function agentsDir(): string { return path.join(getDataDir(), ".agents"); }
function configDir(): string { return path.join(agentsDir(), ".config"); }
function chatDir(): string { return path.join(getDataDir(), ".chat"); }

interface OnboardingRequest {
  homeName?: string;
  roomType?: RoomType;
  answers: {
    name?: string;
    // New field; falls back to legacy companyName if absent.
    workspaceName?: string;
    companyName?: string;
    description: string;
    goals?: string;
    teamSize: string;
    priority?: string;
  };
  selectedAgents: string[];
}

async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDirectory(dest);
  const entries = await listDirectory(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else if (!entry.isSymlink) {
      await copyFile(srcPath, destPath);
    }
  }
}

async function writeIfMissing(absPath: string, content: string): Promise<void> {
  if (await fileExists(absPath)) return;
  await writeFileContent(absPath, content);
}

export const POST = route(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as OnboardingRequest;
    const { answers } = body;
    const roomType: RoomType = body.roomType || "office";
    const roomConfig = getRoomConfig(roomType);
    const workspaceName =
      answers.workspaceName?.trim() || answers.companyName?.trim() || "My Cabinet";
    const homeName =
      body.homeName?.trim() || (answers.name ? `${answers.name}'s Home` : "Home");

    const selectedAgents = mergeMandatoryAgentSlugs(
      body.selectedAgents || [],
      roomType
    );
    const mandatorySlugs = getMandatoryAgentSlugs(roomType);
    const libraryDir = await resolveAgentLibraryDir();

    if (!libraryDir) {
      return NextResponse.json(
        { error: "Agent library is unavailable" },
        { status: 500 }
      );
    }

    // 1. Save workspace config (v2 shape, forward-compatible with multi-room).
    await ensureDirectory(configDir());
    const workspaceConfig = {
      exists: true,
      version: 2,
      home: { name: homeName },
      room: {
        id: `${roomType}-01`,
        type: roomType,
        name: roomConfig.label,
      },
      cabinet: {
        name: workspaceName,
        description: answers.description,
        size: answers.teamSize || "",
      },
      setupDate: new Date().toISOString(),
    };
    await writeFileContent(
      path.join(configDir(), "workspace.json"),
      JSON.stringify(workspaceConfig, null, 2)
    );

    // Legacy company.json — keeps old code paths working (config route fallback, etc.)
    await writeFileContent(
      path.join(configDir(), "company.json"),
      JSON.stringify(
        {
          exists: true,
          company: {
            name: workspaceName,
            description: answers.description,
            goals: answers.goals || "",
            teamSize: answers.teamSize,
            priority: answers.priority || "",
          },
          setupDate: workspaceConfig.setupDate,
        },
        null,
        2
      )
    );

    // 2. Bootstrap root cabinet structure (cabinet protocol compliance)
    await scaffoldCabinet(getDataDir(), {
      name: workspaceName,
      kind: "root",
      description: answers.description,
      body: answers.description,
      tags: [roomType],
      skipExisting: true,
    });

    // 3. Mark onboarding as complete
    await writeFileContent(
      path.join(configDir(), "onboarding-complete.json"),
      JSON.stringify({ completed: true, date: new Date().toISOString() })
    );

    // Also write the old-format config so existing config check works
    await writeFileContent(
      path.join(agentsDir(), ".config.json"),
      JSON.stringify({ exists: true })
    ).catch(() => {});

    // 4. Instantiate selected agents from library templates
    for (const slug of selectedAgents) {
      const templateDir = path.join(libraryDir, slug);
      const targetDir = path.join(agentsDir(), slug);

      if (!(await fileExists(templateDir))) {
        if (mandatorySlugs.includes(slug)) {
          return NextResponse.json(
            { error: `Required agent template "${slug}" is unavailable` },
            { status: 500 }
          );
        }
        continue; // Template doesn't exist, skip
      }

      // Skip if agent already exists
      if (await fileExists(targetDir)) {
        continue;
      }

      // Copy template
      await copyDir(templateDir, targetDir);
      await ensureAgentScaffold(targetDir);

      // Inject context into persona.md. Substitutes both variable families so
      // new personas (using workspace_*) and legacy ones (using company_*) both work.
      const personaPath = path.join(targetDir, "persona.md");
      try {
        const raw = await readFileContent(personaPath);
        const injected = raw
          .replace(/\{\{company_name\}\}/g, workspaceName)
          .replace(/\{\{workspace_name\}\}/g, workspaceName)
          .replace(/\{\{company_description\}\}/g, answers.description || "")
          .replace(/\{\{workspace_description\}\}/g, answers.description || "")
          .replace(/\{\{home_name\}\}/g, homeName)
          .replace(/\{\{goals\}\}/g, answers.goals || answers.priority || "");
        await writeFileContent(personaPath, injected);
      } catch {
        // Ignore injection errors
      }
    }

    // 5. Create chat channels from all agent channel references
    await ensureDirectory(chatDir());

    // Collect all channels referenced by agents + map members
    const channelMembers = new Map<string, Set<string>>();
    // Always create #general with all agents
    channelMembers.set("general", new Set(selectedAgents));

    for (const slug of selectedAgents) {
      try {
        const personaPath = path.join(agentsDir(), slug, "persona.md");
        const raw = await readFileContent(personaPath);
        const { data } = matter(raw);
        const agentChannels = (data.channels as string[]) || [];
        for (const ch of agentChannels) {
          if (!channelMembers.has(ch)) {
            channelMembers.set(ch, new Set());
          }
          channelMembers.get(ch)!.add(slug);
        }
        // Also add leadership agents to all channels
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
      general: "Shared space for announcements and discussion",
      leadership: "Strategic planning and goal setting",
      marketing: "Marketing campaigns, content, and SEO",
      content: "Content creation, editing, and review",
      sales: "Lead generation, outreach, and deals",
      engineering: "Technical work and code quality",
      notes: "PKM curation, links, and indexes",
      writing: "Drafting, editing, and review",
      inbox: "Email triage and drafts",
      calendar: "Scheduling and reminders",
      habits: "Habit tracking and reflection",
      tools: "Small scripts, dashboards, and plugins",
      research: "Research agenda and paper reviews",
      teaching: "Lecture prep, slides, problem sets",
      schedule: "Family calendar and logistics",
      meals: "Meal planning and grocery lists",
      kids: "Kids' schedules, activities, and projects",
      household: "Household coordination and admin",
    };

    const channels = Array.from(channelMembers.entries()).map(
      ([slug, members]) => ({
        slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        members: Array.from(members),
        description:
          channelDescriptions[slug] || `${slug} channel`,
      })
    );

    await writeFileContent(
      path.join(chatDir(), "channels.json"),
      JSON.stringify(channels, null, 2)
    );

    // Create channel directories
    for (const ch of channels) {
      const chDir = path.join(chatDir(), ch.slug);
      await ensureDirectory(chDir);
      // Only create files if they don't exist (don't wipe existing messages)
      await writeIfMissing(path.join(chDir, "messages.md"), "");
      await writeIfMissing(path.join(chDir, "pins.json"), JSON.stringify([]));
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
