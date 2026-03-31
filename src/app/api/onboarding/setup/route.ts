import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OnboardingRequest;
    const { answers, selectedAgents } = body;

    // 1. Save company config
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CONFIG_DIR, "company.json"),
      JSON.stringify(
        {
          exists: true,
          name: answers.companyName,
          description: answers.description,
          goals: answers.goals,
          teamSize: answers.teamSize,
          priority: answers.priority,
          setupDate: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // 2. Mark onboarding as complete
    await fs.writeFile(
      path.join(CONFIG_DIR, "onboarding-complete.json"),
      JSON.stringify({ completed: true, date: new Date().toISOString() })
    );

    // Also write the old-format config so existing config check works
    await fs.writeFile(
      path.join(CONFIG_DIR, "../.config.json"),
      JSON.stringify({ exists: true })
    ).catch(() => {});

    // 3. Instantiate selected agents from library templates
    for (const slug of selectedAgents) {
      const templateDir = path.join(LIBRARY_DIR, slug);
      const targetDir = path.join(AGENTS_DIR, slug);

      try {
        await fs.access(templateDir);
      } catch {
        continue; // Template doesn't exist, skip
      }

      // Skip if agent already exists
      try {
        await fs.access(targetDir);
        continue;
      } catch {
        // Good, doesn't exist
      }

      // Copy template
      await copyDir(templateDir, targetDir);

      // Create standard subdirectories
      for (const subdir of ["jobs", "skills", "sessions", "memory"]) {
        await fs.mkdir(path.join(targetDir, subdir), { recursive: true });
      }

      // Inject company context into persona.md
      const personaPath = path.join(targetDir, "persona.md");
      try {
        const raw = await fs.readFile(personaPath, "utf-8");
        const injected = raw
          .replace(/\{\{company_name\}\}/g, answers.companyName)
          .replace(/\{\{company_description\}\}/g, answers.description)
          .replace(
            /\{\{goals\}\}/g,
            answers.goals || answers.priority || ""
          );
        await fs.writeFile(personaPath, injected);
      } catch {
        // Ignore injection errors
      }
    }

    // 4. Create default chat channels
    await fs.mkdir(CHAT_DIR, { recursive: true });
    const defaultChannels = [
      {
        slug: "general",
        name: "General",
        members: selectedAgents,
        description: "Company-wide announcements and discussion",
      },
    ];

    // Add department-specific channels based on selected agents
    const deptChannels = new Set<string>();
    for (const slug of selectedAgents) {
      try {
        const personaPath = path.join(AGENTS_DIR, slug, "persona.md");
        const raw = await fs.readFile(personaPath, "utf-8");
        const { data } = matter(raw);
        if (data.department && data.department !== "leadership") {
          deptChannels.add(data.department);
        }
      } catch {
        // Skip
      }
    }

    for (const dept of deptChannels) {
      const members = [];
      for (const slug of selectedAgents) {
        try {
          const personaPath = path.join(AGENTS_DIR, slug, "persona.md");
          const raw = await fs.readFile(personaPath, "utf-8");
          const { data } = matter(raw);
          if (
            data.department === dept ||
            data.department === "leadership"
          ) {
            members.push(slug);
          }
        } catch {
          // Skip
        }
      }
      defaultChannels.push({
        slug: dept,
        name: dept.charAt(0).toUpperCase() + dept.slice(1),
        members,
        description: `${dept} team channel`,
      });
    }

    await fs.writeFile(
      path.join(CHAT_DIR, "channels.json"),
      JSON.stringify(defaultChannels, null, 2)
    );

    // Create channel directories
    for (const ch of defaultChannels) {
      const chDir = path.join(CHAT_DIR, ch.slug);
      await fs.mkdir(chDir, { recursive: true });
      await fs.writeFile(path.join(chDir, "messages.md"), "");
      await fs.writeFile(
        path.join(chDir, "pins.json"),
        JSON.stringify([])
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
