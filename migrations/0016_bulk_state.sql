CREATE TABLE IF NOT EXISTS bulk_state (
  source TEXT PRIMARY KEY,
  fingerprint TEXT,
  updated_at TEXT NOT NULL
);
