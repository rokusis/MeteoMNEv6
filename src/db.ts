import type { Station } from './sources/zhms-aws/parseStations';
import type { NormalizedObservation } from './sources/zhms-aws/normalize';

export async function saveStations(db: D1Database, stations: Station[]): Promise<void> {
  const now = new Date().toISOString();
  for (const s of stations) {
    await db.prepare(
      `INSERT INTO stations (station_id, wmo_id, name, latitude, longitude, elevation, station_type, river, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id) DO UPDATE SET wmo_id=excluded.wmo_id, name=excluded.name, latitude=excluded.latitude, longitude=excluded.longitude, elevation=excluded.elevation, station_type=excluded.station_type, river=excluded.river, is_active=excluded.is_active, updated_at=excluded.updated_at`
    ).bind(s.stationId, (s as any).wmoId ?? null, s.name, s.latitude, s.longitude, s.elevation ?? null, (s as any).stationType ?? s.stationType ?? null, (s as any).river ?? null, s.statusFlag === 1 || s.statusFlag === '1' || (s as any).flag === 1 ? 1 : 0, now).run();
  }
}

export async function saveObservations(db: D1Database, obs: NormalizedObservation[]): Promise<void> {
  const now = new Date().toISOString();
  for (const o of obs) {
    await db.prepare(
      `INSERT INTO observations (station_id, measured_at_raw, temperature_c, precipitation_mm, wind_speed_ms, wind_direction_code, wind_direction_deg, wind_compass, gust_ms, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id) DO UPDATE SET measured_at_raw=excluded.measured_at_raw, temperature_c=excluded.temperature_c, precipitation_mm=excluded.precipitation_mm, wind_speed_ms=excluded.wind_speed_ms, wind_direction_code=excluded.wind_direction_code, wind_direction_deg=excluded.wind_direction_deg, wind_compass=excluded.wind_compass, gust_ms=excluded.gust_ms, fetched_at=excluded.fetched_at`
    ).bind(o.stationId, o.measuredAtRaw, o.temperatureC ?? null, o.precipitationMm ?? null, o.windSpeedMs ?? null, o.windDirectionCode ?? null, o.windDirectionDeg ?? null, o.windCompass ?? null, o.gustMs ?? null, now).run();
  }
}

export async function loadObservations(db: D1Database): Promise<NormalizedObservation[]> {
  const { results } = await db.prepare(`SELECT s.station_id, s.wmo_id, s.name as stationName, s.is_active, o.* FROM observations o JOIN stations s ON s.station_id = o.station_id`).all();
  return (results as any[]).map(r => ({
    stationId: r.station_id,
    wmoId: r.wmo_id ?? null,
    stationName: r.stationName,
    measuredAtRaw: r.measured_at_raw,
    temperatureC: r.temperature_c,
    precipitationMm: r.precipitation_mm,
    windSpeedMs: r.wind_speed_ms,
    windDirectionCode: r.wind_direction_code,
    windDirectionDeg: r.wind_direction_deg,
    windCompass: r.wind_compass,
    gustMs: r.gust_ms,
    isActiveStation: !!r.is_active,
  }));
}

export async function saveSourceStatus(db: D1Database, source: string, count: number, error: string | null): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO source_status (source, last_success_at, last_fetched_at, last_error, last_count)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(source) DO UPDATE SET last_success_at=excluded.last_success_at, last_fetched_at=excluded.last_fetched_at, last_error=excluded.last_error, last_count=excluded.last_count`
  ).bind(source, error ? null : now, now, error, count).run();
}
