import { fetchHydroLive, saveHydro } from '../sources/hydro/liveHydro';
import { hydroFingerprint } from './hydroLogger';

// Ritam: na svakih 5 minuta (odluka vlasnika 22.09: reke smeju do 5 min
// kasnjenja; glavno ostaje ispod 3 min). 10-minutni pisac je rezerva.
export function hydroWatchOpen(nowMs: number): boolean {
  return new Date(nowMs).getUTCMinutes() % 5 === 0;
}

// Gusti tick: max 1 mali GET po pozivu, D1 upis samo na promenu/gresku
// plus heartbeat jednom dnevno u ponoc da se vidi da straza zivi.
// Vraca da li je provereno i da li se promenilo.
export async function runHydroTick(db: D1Database, nowMs: number): Promise<{ checked: boolean; changed: boolean }> {
  if (!hydroWatchOpen(nowMs)) return { checked: false, changed: false };
  const now = new Date(nowMs).toISOString();
  try {
    const r = await fetchHydroLive(db);
    const fp = hydroFingerprint(r.stations, r.observations);
    let prev: string | null = null;
    try {
      const row = (await db
        .prepare(`SELECT fingerprint FROM hydro_log ORDER BY checked_at DESC LIMIT 1`)
        .first()) as any;
      prev = row?.fingerprint ?? null;
    } catch {}
    const changed = prev == null || prev !== fp;
    const heartbeat = new Date(nowMs).getUTCMinutes() === 0 && new Date(nowMs).getUTCHours() === 0;
    const status = prev == null ? 'first' : changed ? 'changed' : 'same';
    if (changed || heartbeat || prev == null) {
      await db
        .prepare(`INSERT INTO hydro_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
        .bind(now, status, fp.slice(0, 4000), r.observations.length)
        .run();
    }
    // Straza je videla promenu: odmah osvezi i kes za serviranje da korisnik
    // ne ceka 10-minutni krug. Retko se desava, jeftino je, guard je u saveHydro.
    if (changed) {
      try {
        await saveHydro(db, r.stations, r.observations);
      } catch {}
    }
    return { checked: true, changed };
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO hydro_log (checked_at, status, fingerprint, station_count) VALUES (?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null)
        .run();
    } catch {}
    return { checked: true, changed: false };
  }
}
