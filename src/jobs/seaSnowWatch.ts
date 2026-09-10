import { fetchSeaSnowLive, saveSeaSnow } from '../sources/zhms-sea-snow/liveSeaSnow';
import { seaSnowFingerprint } from './seaSnowLogger';

// Gusta straza za more/sneg: provera na svaka 2 minuta ceo dan.
// Merenje 07-09.09. pokazalo ~1 promenu dnevno ujutru (~08:30 UTC),
// ali pravilo svezine trazi puno radno vreme pa prozor sluzi samo kao
// dijagnostika, ne kao kapija. Sneg dolazi gratis u istom odgovoru.
// 10-minutni sentinel je ugasen jer ga ova straza potpuno zamenjuje.
export function seaSnowWatchOpen(nowMs: number): boolean {
  return new Date(nowMs).getUTCMinutes() % 2 === 0;
}

// Gusti tick: max 1 mali GET po pozivu, D1 upis samo na promenu/gresku
// plus heartbeat na pun sat da se vidi da straza zivi.
// Vraca da li je provereno i da li se promenilo.
export async function runSeaSnowTick(db: D1Database, nowMs: number): Promise<{ checked: boolean; changed: boolean }> {
  if (!seaSnowWatchOpen(nowMs)) return { checked: false, changed: false };
  const now = new Date(nowMs).toISOString();
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
    const changed = prev == null || prev !== fp;
    const heartbeat = new Date(nowMs).getUTCMinutes() === 0;
    const status = prev == null ? 'first' : changed ? 'changed' : 'same';
    if (changed || heartbeat || prev == null) {
      await db
        .prepare(`INSERT INTO sea_snow_log (checked_at, status, fingerprint, sea_count, snow_count) VALUES (?, ?, ?, ?, ?)`)
        .bind(now, status, fp.slice(0, 4000), r.sea.length, r.snow.length)
        .run();
    }
    // Straza je videla promenu: odmah osvezi i kes za serviranje da korisnik
    // ne ceka 10-minutni krug. Retko se desava, jeftino je, guard je u saveSeaSnow.
    if (changed) {
      try {
        await saveSeaSnow(db, r.sea, r.snow);
      } catch {}
    }
    return { checked: true, changed };
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO sea_snow_log (checked_at, status, fingerprint, sea_count, snow_count) VALUES (?, ?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null, null)
        .run();
    } catch {}
    return { checked: true, changed: false };
  }
}
