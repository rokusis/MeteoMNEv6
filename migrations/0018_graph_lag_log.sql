CREATE TABLE IF NOT EXISTS graph_lag_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  station_id TEXT NOT NULL,
  lag_min REAL NOT NULL,
  snapshot_raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_graph_lag_checked ON graph_lag_log(checked_at);
