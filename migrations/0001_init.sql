CREATE TABLE IF NOT EXISTS stations (
  station_id TEXT PRIMARY KEY,
  wmo_id TEXT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation REAL,
  station_type TEXT,
  is_active INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observations (
  station_id TEXT PRIMARY KEY,
  measured_at_raw TEXT NOT NULL,
  temperature_c REAL,
  precipitation_mm REAL,
  wind_speed_ms REAL,
  wind_direction_code INTEGER,
  wind_direction_deg REAL,
  wind_compass TEXT,
  gust_ms REAL,
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (station_id) REFERENCES stations(station_id)
);
CREATE TABLE IF NOT EXISTS source_status (
  source TEXT PRIMARY KEY,
  last_success_at TEXT,
  last_fetched_at TEXT,
  last_error TEXT,
  last_count INTEGER
);
