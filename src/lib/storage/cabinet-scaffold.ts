import path from "path";
import yaml from "js-yaml";
import { PROJECT_ROOT } from "@/lib/runtime/runtime-config";
import {
  copyFile,
  ensureDirectory,
  fileExists,
  listDirectory,
  writeFileContent,
} from "./fs-operations";

export interface ScaffoldCabinetOptions {
  name: string;
  kind: "root" | "child";
  description?: string;
  /** Extra markdown content written after the H1 in index.md */
  body?: string;
  tags?: string[];
  /**
   * When true, existing .cabinet and index.md are not overwritten.
   * Useful for re-running onboarding on an already-initialized directory.
   */
  skipExisting?: boolean;
}

const GETTING_STARTED_DIRNAME = "getting-started";

async function copyDirectoryMerge(src: string, dest: string): Promise<void> {
  await ensureDirectory(dest);
  const entries = await listDirectory(src);

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory) {
      await copyDirectoryMerge(srcPath, destPath);
      continue;
    }

    if (await fileExists(destPath)) {
      continue;
    }

    await ensureDirectory(path.dirname(destPath));
    await copyFile(srcPath, destPath);
  }
}

async function resolveGettingStartedSeedDir(targetDir: string): Promise<string | null> {
  const destinationDir = path.resolve(targetDir, GETTING_STARTED_DIRNAME);
  const sourceDir = path.join(PROJECT_ROOT, "resources", GETTING_STARTED_DIRNAME);

  if (path.resolve(sourceDir) === destinationDir) {
    return null;
  }

  if (!(await fileExists(sourceDir))) {
    return null;
  }

  return sourceDir;
}

export async function seedGettingStartedDir(targetDir: string): Promise<void> {
  const sourceDir = await resolveGettingStartedSeedDir(targetDir);
  if (!sourceDir) {
    return;
  }

  await copyDirectoryMerge(
    sourceDir,
    path.join(targetDir, GETTING_STARTED_DIRNAME)
  );
}

/**
 * Bootstrap the canonical cabinet directory structure:
 *   .cabinet          — YAML identity manifest
 *   index.md          — entry point
 *   .agents/          — agent personas
 *   .jobs/            — scheduled automations
 *   .cabinet-state/   — runtime state
 */
export async function scaffoldCabinet(
  targetDir: string,
  options: ScaffoldCabinetOptions
): Promise<void> {
  const { name, kind, description = "", body = "", tags = [], skipExisting = false } = options;

  // Directories — always idempotent
  await ensureDirectory(path.join(targetDir, ".agents"));
  await ensureDirectory(path.join(targetDir, ".jobs"));
  await ensureDirectory(path.join(targetDir, ".cabinet-state"));

  // .cabinet manifest
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const manifest = {
    schemaVersion: 1,
    id: `${slug}-${kind}`,
    name,
    kind,
    version: "0.1.0",
    description: description || `${name} cabinet.`,
    entry: "index.md",
  };

  const manifestPath = path.join(targetDir, ".cabinet");
  if (!skipExisting || !(await fileExists(manifestPath))) {
    await writeFileContent(manifestPath, yaml.dump(manifest, { lineWidth: -1 }));
  }

  // index.md
  const now = new Date().toISOString();
  const frontmatterLines = [
    "---",
    `title: "${name}"`,
    `created: "${now}"`,
    `modified: "${now}"`,
  ];
  if (tags.length > 0) {
    frontmatterLines.push("tags:");
    for (const tag of tags) frontmatterLines.push(`  - ${tag}`);
  }
  frontmatterLines.push("---");

  const bodyLines = ["", `# ${name}`, ""];
  if (body) bodyLines.push(body, "");

  const indexContent = [...frontmatterLines, ...bodyLines].join("\n");
  const indexPath = path.join(targetDir, "index.md");
  if (!skipExisting || !(await fileExists(indexPath))) {
    await writeFileContent(indexPath, indexContent);
  }

  await seedGettingStartedDir(targetDir);
}
