import path from "path";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { writePersona } from "@/lib/agents/persona-manager";
import { getDefaultProviderId } from "@/lib/agents/provider-runtime";
import { HttpError } from "@/lib/http/create-handler";
import { assertValidSlug } from "@/lib/agents/persona/slug-utils";
import {
  ensureDirectory,
  fileExists,
  writeFileContent,
} from "@/lib/storage/fs-operations";

export interface ImportBundle {
  agent?: {
    slug?: string;
    frontmatter?: Record<string, unknown>;
    body?: string;
  };
  workspaceIndex?: string;
}

export interface ImportResult {
  slug: string;
  displayName: string;
}

export async function importAgentBundle(bundle: ImportBundle): Promise<ImportResult> {
  if (!bundle.agent?.slug || !bundle.agent?.frontmatter) {
    throw new HttpError(400, "Invalid bundle format");
  }

  assertValidSlug(bundle.agent.slug);

  let slug = bundle.agent.slug;
  const baseAgentDir = path.join(DATA_DIR, ".agents", slug);
  if (await fileExists(path.join(baseAgentDir, "persona.md"))) {
    slug = `${slug}-imported-${Date.now().toString(36).slice(-4)}`;
    assertValidSlug(slug);
  }

  const fm = bundle.agent.frontmatter as Record<string, unknown>;
  const displayName = (fm.name as string) || slug;

  await writePersona(slug, {
    name: displayName,
    role: (fm.role as string) || "",
    provider: (fm.provider as string) || getDefaultProviderId(),
    heartbeat: (fm.heartbeat as string) || "0 8 * * *",
    budget: (fm.budget as number) ?? 100,
    active: false,
    workdir: (fm.workdir as string) || "/data",
    focus: (fm.focus as string[]) || [],
    tags: (fm.tags as string[]) || [],
    emoji: (fm.emoji as string) || "🤖",
    department: (fm.department as string) || "general",
    type: (fm.type as "lead" | "specialist" | "support") || "specialist",
    goals: (fm.goals as never[]) || [],
    channels: (fm.channels as string[]) || ["general"],
    workspace: (fm.workspace as string) || "workspace",
    slug,
    body: bundle.agent.body || "",
  });

  const agentDir = path.join(DATA_DIR, ".agents", slug);
  const workspaceDir = path.join(agentDir, "workspace");
  await ensureDirectory(workspaceDir);

  if (bundle.workspaceIndex) {
    const { data: wsFm, content: wsBody } = matter(bundle.workspaceIndex);
    wsFm.title = `${displayName} — Workspace`;
    const newWsContent = matter.stringify(wsBody, wsFm);
    await writeFileContent(path.join(workspaceDir, "index.md"), newWsContent);
  }

  await ensureDirectory(path.join(DATA_DIR, ".agents", ".memory", slug));
  await ensureDirectory(path.join(workspaceDir, "reports"));
  await ensureDirectory(path.join(workspaceDir, "data"));

  return { slug, displayName };
}
