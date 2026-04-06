import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

export function runSqlMigrations(
  db: Database.Database,
  migrationsDir: string
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const appliedVersions = new Set<number>(
    (
      db.prepare("SELECT version FROM schema_version ORDER BY version").all() as {
        version: number;
      }[]
    ).map((row) => row.version)
  );

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const versionMatch = file.match(/^(\d+)/);
    if (!versionMatch) continue;

    const version = Number.parseInt(versionMatch[1], 10);
    if (appliedVersions.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_version (version, applied_at) VALUES (?, datetime('now'))"
      ).run(version);
    });

    applyMigration();
  }
}

