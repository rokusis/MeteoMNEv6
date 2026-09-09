import { fetchAirLive } from '../sources/epa-air/liveAir';

// Otisak: stanica|datum|zagadjivac=vrednost za sve. Kad se promeni, EPA je osvezio.
export function airFingerprint(stations: any[]): string {
  return (stations ?? [])
    .map((s: any) => {
      const vals = Array.isArray(s.values)
        ? s.values.map((v: any) => `${v.pollutant ?? ''}=${v.valueRaw ?? ''}`).join(',')
        : '';
      return `${s.id ?? ''}|${s.dateRaw ?? ''}|${vals}`;
    })
    .sort()
    .join(';');
}

// Privremeni merac 48h: svaki 10-minutni krug zabelezi da li se ista promenilo.
// Trosi po krugu: 1 spoljni GET + 1 SELECT + 1 mali INSERT. Bez novog cron triggera.
// Posle merenja se poziv iz krona brise, tabela ostaje kao trag.
export async function logAirSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  try {
    const r = await fetchAirLive();
    const fp = airFingerprint(r.stations);
    let prev: string | null = null;
    try {
      const row = (await db
        .prepare(`SELECT fingerprint FROM air_log ORDER BY checked_at DESC LIMIT 1`)
        .first()) as any;
      prev = row?.fingerprint ?? null;
    } catch {}
    const status = prev == null ? 'first' : prev === fp ? 'same' : 'changed';
    await db
      .prepare(`INSERT INTO air_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
      .bind(now, status, fp.slice(0, 4000), r.stations.length)
      .run();
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO air_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null)
        .run();
    } catch {}
  }
}
