import { fetchSeaSnowLive } from '../sources/zhms-sea-snow/liveSeaSnow';

// Otisak: mesto|temperatura/visina za more i sneg. Kad se promeni, izvor je osvezen.
export function seaSnowFingerprint(sea: any[], snow: any[]): string {
  const s = (sea ?? []).map((x: any) => `${x.place ?? ''}|${x.tempC ?? ''}|${x.timeRaw ?? ''}`).sort().join(';');
  const n = (snow ?? []).map((x: any) => `${x.place ?? ''}|${x.heightCm ?? ''}`).sort().join(';');
  return s + '#' + n;
}

// Privremeni merac 48h: svaki 10-minutni krug zabelezi da li se ista promenilo.
// Posle merenja se poziv iz krona brise, tabela ostaje kao trag.
export async function logSeaSnowSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  try {
    const r = await fetchSeaSnowLive();
    const fp = seaSnowFingerprint(r.sea, r.snow);
    let prev: string | null = null;
    try {
      const row = (await db
        .prepare(`SELECT fingerprint FROM sea_snow_log ORDER BY checked_at DESC LIMIT 1`)
        .first()) as any;
      prev = row?.fingerprint ?? null;
    } catch {}
    const status = prev == null ? 'first' : prev === fp ? 'same' : 'changed';
    await db
      .prepare(`INSERT INTO sea_snow_log (checked_at, status, fingerprint, sea_count, snow_count) VALUES (?, ?, ?, ?, ?)`)
      .bind(now, status, fp.slice(0, 4000), r.sea.length, r.snow.length)
      .run();
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO sea_snow_log (checked_at, status, fingerprint, sea_count, snow_count) VALUES (?, ?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null, null)
        .run();
    } catch {}
  }
}
