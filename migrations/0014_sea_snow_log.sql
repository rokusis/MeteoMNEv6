CREATE TABLE IF NOT EXISTS sea_snow_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  fingerprint TEXT,
  sea_count INTEGER,
  snow_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sea_snow_log_checked ON sea_snow_log(checked_at);
