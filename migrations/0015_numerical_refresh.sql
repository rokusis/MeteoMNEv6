CREATE TABLE IF NOT EXISTS numerical_refresh (
  model TEXT PRIMARY KEY,
  last_modified TEXT,
  cursor_idx INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle',
  updated_at TEXT NOT NULL
);
