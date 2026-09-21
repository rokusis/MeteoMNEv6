CREATE TABLE IF NOT EXISTS schema_state (
  source TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  pending_fp TEXT,
  pending_hits INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
