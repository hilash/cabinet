import { watch } from "node:fs";
import fs from "node:fs/promises";
import { ZodError } from "zod";
import { migrateFromLegacy } from "./migrator";
import {
  DEFAULT_CABINET_CONFIG,
  parseCabinetConfig,
  type CabinetConfig,
} from "./schema";
import {
  getAgentsDir,
  getCabinetConfigDir,
  getCabinetConfigPath,
  getLegacyIntegrationsPath,
  getLegacySchedulePaths,
} from "./paths";

function formatValidationError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

async function readCabinetConfigFile(dataDir: string): Promise<CabinetConfig> {
  const configPath = getCabinetConfigPath(dataDir);

  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw error;
    }
    throw new Error(
      `Failed to read Cabinet config at ${configPath}: ${(error as Error).message}`,
      { cause: error },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse Cabinet config JSON at ${configPath}: ${(error as Error).message}`,
      { cause: error },
    );
  }

  if (
    parsedJson !== null &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson)
  ) {
    const record = parsedJson as Record<string, unknown>;
    if ("runtime" in record) {
      delete record.runtime;
    }
    const integrations = record.integrations;
    if (
      integrations !== null &&
      typeof integrations === "object" &&
      !Array.isArray(integrations) &&
      "scheduling" in integrations
    ) {
      delete (integrations as Record<string, unknown>).scheduling;
    }
  }

  try {
    return parseCabinetConfig(parsedJson);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Failed to validate Cabinet config at ${configPath}: ${formatValidationError(error)}`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function legacySourcesExist(dataDir: string): Promise<boolean> {
  const fileCandidates = [
    getLegacyIntegrationsPath(dataDir),
    ...getLegacySchedulePaths(dataDir),
  ];

  for (const filePath of fileCandidates) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  const agentsDir = getAgentsDir(dataDir);
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    return entries.some((entry) => {
      if (entry.name.startsWith(".")) {
        return false;
      }
      return entry.isDirectory() || (entry.isFile() && entry.name.endsWith(".md"));
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function saveCabinetConfig(
  dataDir: string,
  config: CabinetConfig,
): Promise<void> {
  const parsed = parseCabinetConfig(config);
  const configDir = getCabinetConfigDir(dataDir);
  const configPath = getCabinetConfigPath(dataDir);
  const tempPath = `${configPath}.tmp-${process.pid}-${Date.now()}`;

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, configPath);
}

export async function loadCabinetConfig(dataDir: string): Promise<CabinetConfig> {
  try {
    return await readCabinetConfigFile(dataDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (await legacySourcesExist(dataDir)) {
    const migrated = await migrateFromLegacy(dataDir);
    await saveCabinetConfig(dataDir, migrated);
    return migrated;
  }

  await saveCabinetConfig(dataDir, DEFAULT_CABINET_CONFIG);
  return DEFAULT_CABINET_CONFIG;
}

export function watchCabinetConfig(
  dataDir: string,
  callback: (config: CabinetConfig) => void | Promise<void>,
): () => void {
  const configDir = getCabinetConfigDir(dataDir);
  const configFileName = "cabinet.config.json";

  void fs.mkdir(configDir, { recursive: true });

  let debounceTimer: NodeJS.Timeout | null = null;
  let closed = false;

  const watcher = watch(configDir, (_eventType, filename) => {
    if (closed) {
      return;
    }

    const resolvedName =
      filename == null
        ? null
        : Buffer.isBuffer(filename)
          ? filename.toString("utf8")
          : filename;
    if (resolvedName && resolvedName !== configFileName) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void loadCabinetConfig(dataDir)
        .then((config) => callback(config))
        .catch((error) => {
          console.error(
            `[cabinet-config] failed to reload ${getCabinetConfigPath(dataDir)}:`,
            error instanceof Error ? error.message : String(error),
          );
        });
    }, 200);
  });

  watcher.on("error", (error) => {
    console.error(
      `[cabinet-config] watcher error for ${getCabinetConfigPath(dataDir)}:`,
      error instanceof Error ? error.message : String(error),
    );
  });

  return () => {
    closed = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    watcher.close();
  };
}
