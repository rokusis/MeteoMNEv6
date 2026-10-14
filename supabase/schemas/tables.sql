-- Supabase sema MeteoMNE (izvor istine za tabele; funkcije su u supabase/functions/).
-- Pravilo: svaka nova tabela ide ovde + migracija preko API-ja, nikad samo klikom.

CREATE TABLE IF NOT EXISTS stations (
  station_id TEXT PRIMARY KEY, wmo_id TEXT, name TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, elevation DOUBLE PRECISION,
  station_type TEXT, is_active BOOLEAN, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  station_id TEXT PRIMARY KEY, measured_at_raw TEXT,
  temperature_c DOUBLE PRECISION, precipitation_mm DOUBLE PRECISION,
  wind_speed_ms DOUBLE PRECISION, wind_direction_code INTEGER,
  wind_direction_deg DOUBLE PRECISION, wind_compass TEXT, gust_ms DOUBLE PRECISION,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bulk_state (
  source TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_status (
  source TEXT PRIMARY KEY, last_success_at TEXT, last_fetched_at TEXT NOT NULL,
  last_error TEXT, last_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS station_timeseries (
  station_id TEXT NOT NULL, ts BIGINT NOT NULL, param TEXT NOT NULL,
  value DOUBLE PRECISION, PRIMARY KEY (station_id, ts, param)
);
CREATE INDEX IF NOT EXISTS idx_timeseries_station_param_ts
  ON station_timeseries(station_id, param, ts);

CREATE TABLE IF NOT EXISTS graph_state (
  station_id TEXT PRIMARY KEY, last_snapshot_ms BIGINT, last_check_ms BIGINT,
  last_change_ms BIGINT, miss INTEGER NOT NULL DEFAULT 0, done_ms BIGINT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_lag_log (
  checked_at TEXT NOT NULL, station_id TEXT NOT NULL,
  lag_min DOUBLE PRECISION, snapshot_raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_graph_lag_checked ON graph_lag_log(checked_at);

CREATE TABLE IF NOT EXISTS hydro_cache (
  id BIGINT PRIMARY KEY CHECK (id = 1), fetched_at TEXT NOT NULL, payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS hydro_log (
  checked_at TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT, station_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_hydro_log_checked ON hydro_log(checked_at);

CREATE TABLE IF NOT EXISTS sea_snow_cache (
  id BIGINT PRIMARY KEY CHECK (id = 1), fetched_at TEXT NOT NULL, payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS sea_snow_log (
  checked_at TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT,
  sea_count INTEGER, snow_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sea_snow_log_checked ON sea_snow_log(checked_at);

CREATE TABLE IF NOT EXISTS official_cache (
  id BIGINT PRIMARY KEY CHECK (id = 1), fetched_at TEXT NOT NULL, payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS official_log (
  checked_at TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT, titles TEXT
);
CREATE INDEX IF NOT EXISTS idx_official_log_checked ON official_log(checked_at);

CREATE TABLE IF NOT EXISTS air_cache (
  id BIGINT PRIMARY KEY CHECK (id = 1), fetched_at TEXT NOT NULL, payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS air_log (
  checked_at TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT, station_count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_air_log_checked ON air_log(checked_at);

CREATE TABLE IF NOT EXISTS synop_cache (
  id BIGINT PRIMARY KEY CHECK (id = 1), meta_hour TEXT, meta_day TEXT,
  fetched_at TEXT NOT NULL, payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS numerical_days (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city TEXT NOT NULL, model TEXT NOT NULL, day_num INTEGER NOT NULL,
  date TEXT, tmin DOUBLE PRECISION, tmax DOUBLE PRECISION, fetched_at TEXT NOT NULL,
  UNIQUE (city, model, day_num)
);
CREATE TABLE IF NOT EXISTS numerical_hours (
  day_id BIGINT NOT NULL REFERENCES numerical_days(id) ON DELETE CASCADE,
  utc_hour TEXT NOT NULL, symbol TEXT, rr_mm DOUBLE PRECISION,
  rh_pct DOUBLE PRECISION, wind_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_num_hours_day ON numerical_hours(day_id);
CREATE TABLE IF NOT EXISTS numerical_refresh (
  model TEXT PRIMARY KEY, last_modified TEXT, cursor_idx INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS numerical_log (
  checked_at TEXT NOT NULL, city TEXT NOT NULL, model TEXT NOT NULL,
  last_modified TEXT, etag TEXT, status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_numerical_log_checked ON numerical_log(checked_at);
