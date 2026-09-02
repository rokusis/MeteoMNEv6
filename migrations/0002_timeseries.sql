CREATE TABLE IF NOT EXISTS station_timeseries (
  station_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  param TEXT NOT NULL,
  value REAL,
  PRIMARY KEY (station_id, ts, param)
);
CREATE INDEX IF NOT EXISTS idx_timeseries_station_param_ts ON station_timeseries(station_id, param, ts);
