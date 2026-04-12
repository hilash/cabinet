import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { CABINET_MANIFEST_FILE } from "@/lib/cabinets/files";
import {
  buildCabinetScopedId,
  normalizeCabinetPath,
} from "@/lib/cabinets/paths";
import {
  cabinetPathFromFs,
  resolveCabinetDir,
} from "@/lib/cabinets/server-paths";
import { cabinetVisibilityModeToDepth } from "@/lib/cabinets/visibility";
import { fileExists, listDirectory, readFileContent } from "@/lib/storage/fs-operations";
import {
  DATA_DIR,
  isHiddenEntry,
} from "@/lib/storage/path-utils";
import type {
  CabinetAgentSummary,
  CabinetJobSummary,
  CabinetManifest,
  CabinetOverview,
  CabinetReference,
  CabinetVisibilityMode,
} from "@/types/cabinets";

type DirectoryEntry = {
  name: string;
  isDirectory: boolean;
  isSymlink: boolean;
};

type CabinetDiscoveryEntry = {
  path: string;
  dirPath: string;
  manifest: CabinetManifest;
  cabinetDepth: number;
};

function trimString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function listDirectorySafe(dirPath: string): Promise<DirectoryEntry[]> {
  try {
    return await listDirectory(dirPath);
  } catch {
    return [];
  }
}

async function readYamlFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFileContent(filePath);
    const parsed = yaml.load(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeManifest(
  manifest: Record<string, unknown>,
  fallbackName: string
): CabinetManifest {
  const sharedContext = Array.isArray(manifest.parent)
    ? undefined
    : (manifest.parent as Record<string, unknown> | undefined);
  const access = Array.isArray(manifest.access)
    ? undefined
    : (manifest.access as Record<string, unknown> | undefined);

  return {
    schemaVersion:
      typeof manifest.schemaVersion === "number" ? manifest.schemaVersion : undefined,
    id: trimString(manifest.id),
    name: trimString(manifest.name) || fallbackName,
    kind: trimString(manifest.kind),
    version: trimString(manifest.version),
    description: trimString(manifest.description),
    entry: trimString(manifest.entry),
    parent: sharedContext
      ? {
          shared_context: Array.isArray(sharedContext.shared_context)
            ? sharedContext.shared_context.filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0
              )
            : undefined,
        }
      : undefined,
    access: access
      ? {
          mode: trimString(access.mode),
        }
      : undefined,
  };
}

async function readCabinetManifestAtDir(dirPath: string): Promise<CabinetManifest | null> {
  const manifestPath = path.join(dirPath, CABINET_MANIFEST_FILE);
  if (!(await fileExists(manifestPath))) {
    return null;
  }

  return normalizeManifest(await readYamlFile(manifestPath), path.basename(dirPath) || "Cabinet");
}

async function readCabinetReferenceByPath(
  virtualPath: string,
  cabinetDepth?: number
): Promise<CabinetReference | null> {
  const manifest = await readCabinetManifestAtDir(resolveCabinetDir(virtualPath));
  if (!manifest) return null;

  return {
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind,
    description: manifest.description,
    path: virtualPath,
    cabinetDepth,
  };
}

async function findParentCabinetReference(
  cabinetVirtualPath: string
): Promise<CabinetReference | null> {
  const cabinetDir = resolveCabinetDir(cabinetVirtualPath);
  let cursor = path.dirname(cabinetDir);

  while (cursor.startsWith(DATA_DIR)) {
    if (await fileExists(path.join(cursor, CABINET_MANIFEST_FILE))) {
      return readCabinetReferenceByPath(cabinetPathFromFs(cursor));
    }

    if (cursor === DATA_DIR) break;
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }

  return null;
}

async function discoverNestedCabinets(
  rootDir: string,
  currentCabinetDepth: number,
  results: CabinetDiscoveryEntry[]
): Promise<void> {
  const entries = await listDirectorySafe(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || isHiddenEntry(entry.name)) continue;

    const childDir = path.join(rootDir, entry.name);
    const childManifest = await readCabinetManifestAtDir(childDir);

    if (childManifest) {
      results.push({
        path: cabinetPathFromFs(childDir),
        dirPath: childDir,
        manifest: childManifest,
        cabinetDepth: currentCabinetDepth + 1,
      });

      await discoverNestedCabinets(childDir, currentCabinetDepth + 1, results);
      continue;
    }

    await discoverNestedCabinets(childDir, currentCabinetDepth, results);
  }
}

async function listDescendantCabinets(
  cabinetVirtualPath: string
): Promise<CabinetDiscoveryEntry[]> {
  const results: CabinetDiscoveryEntry[] = [];
  await discoverNestedCabinets(resolveCabinetDir(cabinetVirtualPath), 0, results);

  return results.sort((left, right) => {
    if (left.cabinetDepth !== right.cabinetDepth) {
      return left.cabinetDepth - right.cabinetDepth;
    }
    return left.manifest.name.localeCompare(right.manifest.name);
  });
}

function normalizeJob(
  parsed: Record<string, unknown>,
  fallbackId: string,
  cabinetPath: string,
  cabinetName: string,
  cabinetDepth: number,
  inherited: boolean
): CabinetJobSummary {
  const id = trimString(parsed.id) || fallbackId;
  const ownerAgent = trimString(parsed.ownerAgent) || trimString(parsed.agentSlug);

  return {
    scopedId: buildCabinetScopedId(cabinetPath, "job", id),
    id,
    name: trimString(parsed.name) || fallbackId,
    description: trimString(parsed.description),
    ownerAgent,
    ownerScopedId: ownerAgent
      ? buildCabinetScopedId(cabinetPath, "agent", ownerAgent)
      : undefined,
    enabled: parsed.enabled !== false,
    schedule: trimString(parsed.schedule) || "",
    prompt: trimString(parsed.prompt),
    cabinetPath,
    cabinetName,
    cabinetDepth,
    inherited,
  };
}

async function countTaskFiles(agentDir: string): Promise<number> {
  const entries = await listDirectorySafe(path.join(agentDir, "tasks"));
  return entries.filter((entry) => !entry.isDirectory).length;
}

async function listCabinetJobs(
  cabinetDir: string,
  cabinetPath: string,
  cabinetName: string,
  cabinetDepth: number,
  inherited: boolean
): Promise<CabinetJobSummary[]> {
  const jobsDir = path.join(cabinetDir, ".jobs");
  const entries = await listDirectorySafe(jobsDir);
  const jobs: CabinetJobSummary[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".yaml") && !entry.name.endsWith(".yml")) continue;

    const parsed = await readYamlFile(path.join(jobsDir, entry.name));
    jobs.push(
      normalizeJob(
        parsed,
        entry.name.replace(/\.(yaml|yml)$/i, ""),
        cabinetPath,
        cabinetName,
        cabinetDepth,
        inherited
      )
    );
  }

  return jobs.sort((left, right) => left.name.localeCompare(right.name));
}

async function readAgentPersona(
  slug: string,
  personaPath: string,
  agentDir: string,
  jobCount: number,
  cabinetPath: string,
  cabinetName: string,
  cabinetDepth: number,
  inherited: boolean
): Promise<CabinetAgentSummary | null> {
  try {
    const raw = await readFileContent(personaPath);
    const { data, content } = matter(raw);

    const name = trimString(data.name) || slug;
    const role = trimString(data.role) || content.trim().split("\n")[0] || "Cabinet agent";

      return {
      scopedId: buildCabinetScopedId(cabinetPath, "agent", slug),
      name,
      slug,
      emoji: trimString(data.emoji) || "🤖",
      role,
      active: data.active !== false,
      department: trimString(data.department) || "general",
      type: trimString(data.type) || "specialist",
      heartbeat: trimString(data.heartbeat),
      workspace: trimString(data.workspace),
      jobCount,
      taskCount: await countTaskFiles(agentDir),
      cabinetPath,
      cabinetName,
      cabinetDepth,
      inherited,
    };
  } catch {
    return null;
  }
}

async function listCabinetAgents(
  cabinetDir: string,
  jobCounts: Map<string, number>,
  cabinetPath: string,
  cabinetName: string,
  cabinetDepth: number,
  inherited: boolean
): Promise<CabinetAgentSummary[]> {
  const agentsDir = path.join(cabinetDir, ".agents");
  const entries = await listDirectorySafe(agentsDir);
  const agents: CabinetAgentSummary[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (!entry.isDirectory) continue;

    const slug = entry.name;
    const agentDir = path.join(agentsDir, slug);
    const personaPath = path.join(agentDir, "persona.md");
    if (!(await fileExists(personaPath))) continue;

    const persona = await readAgentPersona(
      slug,
      personaPath,
      agentDir,
      jobCounts.get(slug) || 0,
      cabinetPath,
      cabinetName,
      cabinetDepth,
      inherited
    );
    if (persona) agents.push(persona);
  }

  return agents.sort((left, right) => left.name.localeCompare(right.name));
}

async function readScopedCabinetData(
  entry: CabinetDiscoveryEntry,
  inherited: boolean
): Promise<{
  agents: CabinetAgentSummary[];
  jobs: CabinetJobSummary[];
}> {
  const jobs = await listCabinetJobs(
    entry.dirPath,
    entry.path,
    entry.manifest.name,
    entry.cabinetDepth,
    inherited
  );
  const jobCounts = new Map<string, number>();

  for (const job of jobs) {
    if (!job.ownerAgent) continue;
    jobCounts.set(job.ownerAgent, (jobCounts.get(job.ownerAgent) || 0) + 1);
  }

  const agents = await listCabinetAgents(
    entry.dirPath,
    jobCounts,
    entry.path,
    entry.manifest.name,
    entry.cabinetDepth,
    inherited
  );

  return { agents, jobs };
}

function toCabinetReference(entry: CabinetDiscoveryEntry): CabinetReference {
  return {
    id: entry.manifest.id,
    name: entry.manifest.name,
    kind: entry.manifest.kind,
    description: entry.manifest.description,
    path: entry.path,
    cabinetDepth: entry.cabinetDepth,
  };
}

export async function readCabinetOverview(
  virtualPath: string,
  options: { visibilityMode?: CabinetVisibilityMode } = {}
): Promise<CabinetOverview> {
  const cabinetPath = normalizeCabinetPath(virtualPath, true);
  if (!cabinetPath) {
    throw new Error("Cabinet path is required");
  }

  const cabinetDir = resolveCabinetDir(cabinetPath);
  const manifest = await readCabinetManifestAtDir(cabinetDir);

  if (!manifest) {
    throw new Error(`Cabinet not found: ${cabinetPath}`);
  }

  const visibilityMode = options.visibilityMode || "own";
  const descendantDepth = cabinetVisibilityModeToDepth(visibilityMode);
  const currentCabinet: CabinetDiscoveryEntry = {
    path: cabinetPath,
    dirPath: cabinetDir,
    manifest,
    cabinetDepth: 0,
  };
  const allDescendants = await listDescendantCabinets(cabinetPath);
  const visibleDescendants = allDescendants.filter((entry) =>
    descendantDepth === null ? true : entry.cabinetDepth <= descendantDepth
  );
  const scopedResults = await Promise.all([
    readScopedCabinetData(currentCabinet, false),
    ...visibleDescendants.map((entry) => readScopedCabinetData(entry, true)),
  ]);

  const agents = scopedResults
    .flatMap((result) => result.agents)
    .sort((left, right) => {
      if (left.cabinetDepth !== right.cabinetDepth) {
        return left.cabinetDepth - right.cabinetDepth;
      }
      return left.name.localeCompare(right.name);
    });
  const jobs = scopedResults
    .flatMap((result) => result.jobs)
    .sort((left, right) => {
      if (left.cabinetDepth !== right.cabinetDepth) {
        return left.cabinetDepth - right.cabinetDepth;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    cabinet: {
      ...manifest,
      path: cabinetPath,
    },
    parent: await findParentCabinetReference(cabinetPath),
    children: allDescendants
      .filter((entry) => entry.cabinetDepth === 1)
      .map(toCabinetReference),
    visibleCabinets: [currentCabinet, ...visibleDescendants].map(toCabinetReference),
    visibilityMode,
    agents,
    jobs,
  };
}
