import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, ".cabinet.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "server", "migrations");

let _db: Database.Database | null = null;

/**
 * Get the singleton database connection for use in Next.js API routes.
 * Initializes the database and runs pending migrations on first call.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  runMigrations(_db);

  return _db;
}

function runMigrations(db: Database.Database): void {
  const hasVersionTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    .get();

  let currentVersion = 0;
  if (hasVersionTable) {
    const row = db
      .prepare("SELECT MAX(version) as version FROM schema_version")
      .get() as { version: number | null } | undefined;
    currentVersion = row?.version ?? 0;
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const versionMatch = file.match(/^(\d+)/);
    if (!versionMatch) continue;

    const version = parseInt(versionMatch[1], 10);
    if (version <= currentVersion) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    db.exec(sql);
  }
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
