CREATE TABLE IF NOT EXISTS synop_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  meta_hour TEXT,
  meta_day TEXT,
  fetched_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
