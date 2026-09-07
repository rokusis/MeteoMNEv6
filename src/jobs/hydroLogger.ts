import { fetchHydroLive } from '../sources/hydro/liveHydro';

// Otisak: stanica|vreme|vodostaj za sve. Kad se promeni, reke su osvezene.
export function hydroFingerprint(stations: any[], observations: any[]): string {
  return observations
    .map((o: any) => `${o.stationId}|${o.measuredAtRaw ?? ''}|${o.waterLevelCm ?? ''}`)
    .sort()
    .join(';');
}

// Privremeni merac 48h: svaki 10-minutni krug zabelezi da li se ista promenilo.
// Posle merenja se poziv iz krona brise, tabela ostaje kao trag.
export async function logHydroSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  try {
    const r = await fetchHydroLive();
    const fp = hydroFingerprint(r.stations, r.observations);
    let prev: string | null = null;
    try {
      const row = (await db
        .prepare(`SELECT fingerprint FROM hydro_log ORDER BY checked_at DESC LIMIT 1`)
        .first()) as any;
      prev = row?.fingerprint ?? null;
    } catch {}
    const status = prev == null ? 'first' : prev === fp ? 'same' : 'changed';
    await db
      .prepare(`INSERT INTO hydro_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
      .bind(now, status, fp.slice(0, 4000), r.observations.length)
      .run();
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO hydro_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null)
        .run();
    } catch {}
  }
}
