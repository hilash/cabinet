import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DATA_DIR } from "../src/lib/storage/path-utils";
import { runFileMigrationsSync } from "../src/lib/system/file-migrations";
import { runSqlMigrations } from "../src/lib/system/sql-migrations";

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

  runFileMigrationsSync();

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
  runSqlMigrations(db, MIGRATIONS_DIR);
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
