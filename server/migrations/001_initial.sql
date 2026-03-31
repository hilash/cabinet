-- Initial schema for Cabinet SQLite database
-- Stores structured, high-volume, queryable data alongside file-based content

-- Agent session metadata
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK(trigger IN ('manual', 'job', 'mission', 'mention', 'heartbeat')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  exit_code INTEGER,
  output_summary TEXT,
  job_id TEXT,
  mission_id TEXT,
  task_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_slug);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel_slug TEXT NOT NULL,
  from_id TEXT NOT NULL,
  from_type TEXT NOT NULL DEFAULT 'agent' CHECK(from_type IN ('agent', 'human', 'system')),
  content TEXT NOT NULL,
  reply_to TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_id);

-- Activity events
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  agent_slug TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  links TEXT,
  mission_id TEXT,
  channel_slug TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity(agent_slug);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(event_type);

-- Job execution history
CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  agent_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  output TEXT,
  error TEXT,
  session_id TEXT REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_agent ON job_runs(agent_slug);
CREATE INDEX IF NOT EXISTS idx_job_runs_started ON job_runs(started_at);

-- Mission task status tracking
CREATE TABLE IF NOT EXISTS mission_tasks (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  agent_slug TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'blocked')),
  order_num INTEGER NOT NULL DEFAULT 0,
  output_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mission_tasks_mission ON mission_tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_agent ON mission_tasks(agent_slug);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_status ON mission_tasks(status);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_version (version) VALUES (1);
