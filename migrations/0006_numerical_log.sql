CREATE TABLE IF NOT EXISTS numerical_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  model TEXT NOT NULL,
  last_modified TEXT,
  etag TEXT,
  checked_at TEXT NOT NULL,
  status TEXT
);
CREATE INDEX IF NOT EXISTS idx_numerical_log_checked ON numerical_log(checked_at);
