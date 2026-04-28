import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  fileExists,
  listDirectory,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";
import { providerRegistry } from "./provider-registry";
import {
  normalizeProviderSettings,
  readProviderSettings,
  type ProviderSettings,
  writeProviderSettings,
} from "./provider-settings";

const AGENTS_DIR = path.join(DATA_DIR, ".agents");

export interface ProviderUsageJobRef {
  agentSlug: string;
  jobId: string;
  jobName: string;
}

export interface ProviderUsage {
  agentSlugs: string[];
  jobs: ProviderUsageJobRef[];
  agentCount: number;
  jobCount: number;
  totalCount: number;
}

export type ProviderUsageMap = Record<string, ProviderUsage>;

export interface ProviderMigration {
  fromProviderId: string;
  toProviderId: string;
}

export interface ProviderConflict {
  providerId: string;
  agentSlugs: string[];
  jobs: ProviderUsageJobRef[];
  suggestedProviderId: string;
}

export class ProviderSettingsConflictError extends Error {
  conflicts: ProviderConflict[];

  constructor(conflicts: ProviderConflict[]) {
    super("Providers still in use require migration before they can be disabled");
    this.name = "ProviderSettingsConflictError";
    this.conflicts = conflicts;
  }
}

export interface ProviderSettingsUpdateInput {
  defaultProvider?: string;
  defaultModel?: string;
  defaultEffort?: string;
  disabledProviderIds?: string[];
  migrations?: ProviderMigration[];
}

export interface ProviderSettingsUpdateResult {
  settings: ProviderSettings;
  usage: ProviderUsageMap;
  migrationsApplied: ProviderMigration[];
}

function emptyUsage(): ProviderUsage {
  return {
    agentSlugs: [],
    jobs: [],
    agentCount: 0,
    jobCount: 0,
    totalCount: 0,
  };
}

function recordAgentUsage(map: ProviderUsageMap, providerId: string, slug: string): void {
  const usage = map[providerId] || emptyUsage();
  if (!usage.agentSlugs.includes(slug)) {
    usage.agentSlugs.push(slug);
  }
  usage.agentCount = usage.agentSlugs.length;
  usage.totalCount = usage.agentCount + usage.jobCount;
  map[providerId] = usage;
}

function recordJobUsage(
  map: ProviderUsageMap,
  providerId: string,
  job: ProviderUsageJobRef
): void {
  const usage = map[providerId] || emptyUsage();
  usage.jobs.push(job);
  usage.jobCount = usage.jobs.length;
  usage.totalCount = usage.agentCount + usage.jobCount;
  map[providerId] = usage;
}

async function safeListDirectory(dir: string): Promise<{ name: string; isDirectory: boolean; isSymlink: boolean }[]> {
  if (!(await fileExists(dir))) return [];
  try {
    return await listDirectory(dir);
  } catch {
    return [];
  }
}

async function safeReadFile(filePath: string): Promise<string | null> {
  if (!(await fileExists(filePath))) return null;
  try {
    return await readFileContent(filePath);
  } catch {
    return null;
  }
}

export async function getProviderUsage(): Promise<ProviderUsageMap> {
  const usage: ProviderUsageMap = {};
  const entries = await safeListDirectory(AGENTS_DIR);

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (!entry.isDirectory && entry.name.endsWith(".md")) {
      const slug = entry.name.replace(/\.md$/, "");
      const personaRaw = await safeReadFile(path.join(AGENTS_DIR, entry.name));
      if (personaRaw) {
        const parsed = matter(personaRaw);
        if (typeof parsed.data.provider === "string" && parsed.data.provider.trim()) {
          recordAgentUsage(usage, parsed.data.provider.trim(), slug);
        }
      }
      continue;
    }

    if (!entry.isDirectory) continue;

    const slug = entry.name;
    const personaPath = path.join(AGENTS_DIR, slug, "persona.md");
    const personaRaw = await safeReadFile(personaPath);
    if (personaRaw) {
      const parsed = matter(personaRaw);
      if (typeof parsed.data.provider === "string" && parsed.data.provider.trim()) {
        recordAgentUsage(usage, parsed.data.provider.trim(), slug);
      }
    }

    const jobsDir = path.join(AGENTS_DIR, slug, "jobs");
    const jobEntries = await safeListDirectory(jobsDir);
    for (const jobEntry of jobEntries) {
      if (jobEntry.isDirectory || !jobEntry.name.endsWith(".yaml")) continue;
      const jobPath = path.join(jobsDir, jobEntry.name);
      const raw = await safeReadFile(jobPath);
      if (!raw) continue;
      const parsed = yaml.load(raw) as Record<string, unknown> | null;
      if (!parsed || typeof parsed.provider !== "string" || !parsed.provider.trim()) continue;
      recordJobUsage(usage, parsed.provider.trim(), {
        agentSlug: slug,
        jobId: typeof parsed.id === "string" ? parsed.id : jobEntry.name.replace(/\.yaml$/, ""),
        jobName: typeof parsed.name === "string" ? parsed.name : jobEntry.name.replace(/\.yaml$/, ""),
      });
    }
  }

  return usage;
}

export async function migrateProviderAssignments(
  fromProviderId: string,
  toProviderId: string
): Promise<void> {
  const entries = await safeListDirectory(AGENTS_DIR);

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (!entry.isDirectory && entry.name.endsWith(".md")) {
      const personaPath = path.join(AGENTS_DIR, entry.name);
      const personaRaw = await safeReadFile(personaPath);
      if (personaRaw) {
        const parsed = matter(personaRaw);
        if (parsed.data.provider === fromProviderId) {
          parsed.data.provider = toProviderId;
          await writeFileContent(personaPath, matter.stringify(parsed.content, parsed.data));
        }
      }
      continue;
    }

    if (!entry.isDirectory) continue;

    const personaPath = path.join(AGENTS_DIR, entry.name, "persona.md");
    const personaRaw = await safeReadFile(personaPath);
    if (personaRaw) {
      const parsed = matter(personaRaw);
      if (parsed.data.provider === fromProviderId) {
        parsed.data.provider = toProviderId;
        await writeFileContent(personaPath, matter.stringify(parsed.content, parsed.data));
      }
    }

    const jobsDir = path.join(AGENTS_DIR, entry.name, "jobs");
    const jobEntries = await safeListDirectory(jobsDir);
    for (const jobEntry of jobEntries) {
      if (jobEntry.isDirectory || !jobEntry.name.endsWith(".yaml")) continue;
      const jobPath = path.join(jobsDir, jobEntry.name);
      const raw = await safeReadFile(jobPath);
      if (!raw) continue;
      const parsed = yaml.load(raw) as Record<string, unknown> | null;
      if (!parsed || parsed.provider !== fromProviderId) continue;
      parsed.provider = toProviderId;
      await writeFileContent(jobPath, yaml.dump(parsed, { lineWidth: -1, noRefs: true }));
    }
  }
}

function validateMigrationTarget(
  migration: ProviderMigration,
  settings: ProviderSettings
): void {
  if (!providerRegistry.get(migration.toProviderId)) {
    throw new Error(`Unknown migration target provider: ${migration.toProviderId}`);
  }
  if (settings.disabledProviderIds.includes(migration.toProviderId)) {
    throw new Error(`Migration target provider is disabled: ${migration.toProviderId}`);
  }
}

export async function updateProviderSettingsWithMigrations(
  input: ProviderSettingsUpdateInput
): Promise<ProviderSettingsUpdateResult> {
  const currentSettings = await readProviderSettings();
  const nextSettings = normalizeProviderSettings({
    defaultProvider: input.defaultProvider ?? currentSettings.defaultProvider,
    defaultModel: input.defaultModel ?? currentSettings.defaultModel,
    defaultEffort: input.defaultEffort ?? currentSettings.defaultEffort,
    disabledProviderIds: input.disabledProviderIds ?? currentSettings.disabledProviderIds,
  });
  const usage = await getProviderUsage();
  const migrations = (input.migrations || []).filter(
    (migration) => migration.fromProviderId !== migration.toProviderId
  );

  for (const migration of migrations) {
    validateMigrationTarget(migration, nextSettings);
  }

  const newlyDisabled = nextSettings.disabledProviderIds.filter(
    (providerId) => !currentSettings.disabledProviderIds.includes(providerId)
  );
  const conflicts = newlyDisabled.flatMap((providerId) => {
    const providerUsage = usage[providerId];
    if (!providerUsage || providerUsage.totalCount === 0) return [];
    const hasMigration = migrations.some((migration) => migration.fromProviderId === providerId);
    if (hasMigration) return [];
    return [{
      providerId,
      agentSlugs: providerUsage.agentSlugs,
      jobs: providerUsage.jobs,
      suggestedProviderId: nextSettings.defaultProvider,
    }] satisfies ProviderConflict[];
  });

  if (conflicts.length > 0) {
    throw new ProviderSettingsConflictError(conflicts);
  }

  for (const migration of migrations) {
    await migrateProviderAssignments(migration.fromProviderId, migration.toProviderId);
  }

  const settings = await writeProviderSettings(nextSettings);
  return {
    settings,
    usage: await getProviderUsage(),
    migrationsApplied: migrations,
  };
}
