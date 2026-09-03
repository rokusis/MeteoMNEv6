CREATE TABLE IF NOT EXISTS numerical_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  model TEXT NOT NULL,
  day_num INTEGER NOT NULL,
  date TEXT,
  tmin REAL,
  tmax REAL,
  fetched_at TEXT NOT NULL,
  UNIQUE(city, model, day_num)
);
CREATE TABLE IF NOT EXISTS numerical_hours (
  day_id INTEGER NOT NULL REFERENCES numerical_days(id) ON DELETE CASCADE,
  utc_hour TEXT NOT NULL,
  symbol TEXT,
  rr_mm REAL,
  rh_pct REAL,
  wind_code TEXT,
  PRIMARY KEY (day_id, utc_hour)
);
CREATE INDEX IF NOT EXISTS idx_numerical_city_model ON numerical_days(city, model);
