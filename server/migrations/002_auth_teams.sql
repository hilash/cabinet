-- Migration 002: Multi-user auth + teams
-- Uses JWT sessions (no sessions table conflict with existing agent sessions table)

-- Internal users table (email is the stable identifier across OAuth providers)
CREATE TABLE IF NOT EXISTS users (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- OAuth account links (allows same user to log in via multiple providers)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  data_dir_override TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Team memberships
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT NOT NULL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
