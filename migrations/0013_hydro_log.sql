CREATE TABLE IF NOT EXISTS hydro_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  fingerprint TEXT,
  station_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_hydro_log_checked ON hydro_log(checked_at);
