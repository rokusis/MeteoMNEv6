CREATE TABLE IF NOT EXISTS air_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fetched_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
