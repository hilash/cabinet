import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { runFileMigrationsSync } from "@/lib/system/file-migrations";
import { runSqlMigrations } from "@/lib/system/sql-migrations";

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

  runFileMigrationsSync();

  _db = new Database(DB_PATH);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  runMigrations(_db);

  return _db;
}

function runMigrations(db: Database.Database): void {
  runSqlMigrations(db, MIGRATIONS_DIR);
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
