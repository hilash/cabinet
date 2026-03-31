import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, ".cabinet.db");
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

let _db: Database.Database | null = null;

/**
 * Get the singleton database connection.
 * Initializes the database and runs pending migrations on first call.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read/write performance
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  runMigrations(_db);

  return _db;
}

/**
 * Run all pending SQL migrations in order.
 * Migration files are named NNN_description.sql and tracked by version number.
 */
function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists (bootstrapping)
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

  // Find migration files
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`);
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

    console.log(`Running migration ${file}...`);
    db.exec(sql);
    console.log(`Migration ${file} applied.`);
  }
}

/**
 * Close the database connection. Call on process shutdown.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
