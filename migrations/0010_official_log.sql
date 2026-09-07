CREATE TABLE IF NOT EXISTS official_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  fingerprint TEXT,
  titles TEXT
);
CREATE INDEX IF NOT EXISTS idx_official_log_checked ON official_log(checked_at);
