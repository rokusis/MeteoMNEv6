CREATE TABLE IF NOT EXISTS air_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  fingerprint TEXT,
  station_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_air_log_checked ON air_log(checked_at);
