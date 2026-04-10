-- Migration 003: Replace custom user/account tables with better-auth schema
-- better-auth auto-creates: user, account, session (singular), verification
-- Our 'sessions' (plural) PTY table is unaffected (different name)
-- No user data exists yet so tables can be safely dropped and recreated

PRAGMA foreign_keys = OFF;

-- Drop custom tables from migration 002
DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS users;

-- Recreate teams without FK reference to dropped 'users' table
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  data_dir_override TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT  -- references better-auth's user.id (no FK to avoid boot-order issues)
);

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Recreate team_members referencing better-auth's 'user' table
CREATE TABLE team_members (
  id TEXT NOT NULL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- references better-auth user.id
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

PRAGMA foreign_keys = ON;
