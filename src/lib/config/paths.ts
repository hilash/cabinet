import path from "node:path";

export function getAgentsDir(dataDir: string): string {
  return path.join(dataDir, ".agents");
}

export function getCabinetConfigDir(dataDir: string): string {
  return path.join(getAgentsDir(dataDir), ".config");
}

export function getCabinetConfigPath(dataDir: string): string {
  return path.join(getCabinetConfigDir(dataDir), "cabinet.config.json");
}

export function getCabinetConfigMigratedAtPath(dataDir: string): string {
  return path.join(getCabinetConfigDir(dataDir), "cabinet.config.migrated-at");
}

export function getLegacyIntegrationsPath(dataDir: string): string {
  return path.join(getCabinetConfigDir(dataDir), "integrations.json");
}

export function getLegacySchedulePaths(dataDir: string): string[] {
  return [
    path.join(getCabinetConfigDir(dataDir), "schedules.json"),
    path.join(getAgentsDir(dataDir), ".health", "schedules.json"),
  ];
}
