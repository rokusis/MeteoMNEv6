CREATE TABLE IF NOT EXISTS graph_state (
  station_id TEXT PRIMARY KEY,
  last_snapshot_ms INTEGER,
  last_check_ms INTEGER,
  last_change_ms INTEGER,
  miss INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
