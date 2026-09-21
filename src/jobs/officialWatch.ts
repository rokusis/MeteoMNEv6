import { fetchOfficialLive } from '../sources/zhms-official-forecast/liveOfficial';
import { officialFingerprint } from './officialLogger';

// Gusta straza za zvanicnu prognozu: danju na svaka 2 minuta, nocu na pola
// sata. Merenje 07-20.09: 0 promena 20-04 lokalno (18-02 UTC), pa nocni redji
// ritam ne dira svezinu. Danju sveze 2-3 min ostaje.
export function officialWatchOpen(nowMs: number): boolean {
  const d = new Date(nowMs);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h >= 18 || h < 2) return m % 30 === 0;
  return m % 2 === 0;
}

// Gusti tick: max 1 mali GET po pozivu, D1 upis samo na promenu/gresku
// plus heartbeat jednom dnevno u ponoc da se vidi da straza zivi.
// Vraca da li je provereno i da li se promenilo.
export async function runOfficialTick(db: D1Database, nowMs: number): Promise<{ checked: boolean; changed: boolean }> {
  if (!officialWatchOpen(nowMs)) return { checked: false, changed: false };
  const now = new Date(nowMs).toISOString();
  try {
    const o = await fetchOfficialLive();
    const fp = officialFingerprint(o);
    let prev: string | null = null;
    try {
      const row = (await db
        .prepare(`SELECT fingerprint FROM official_log ORDER BY checked_at DESC LIMIT 1`)
        .first()) as any;
      prev = row?.fingerprint ?? null;
    } catch {}
    const changed = prev == null || prev !== fp;
    const heartbeat = new Date(nowMs).getUTCMinutes() === 0 && new Date(nowMs).getUTCHours() === 0;
    const status = prev == null ? 'first' : changed ? 'changed' : 'same';
    if (changed || heartbeat || prev == null) {
      await db
        .prepare(`INSERT INTO official_log (checked_at, status, fingerprint, titles) VALUES (?, ?, ?, ?)`)
        .bind(
          now,
          status,
          fp,
          (o?.days ?? [])
            .map((d: any) => d.title)
            .join(' | ')
            .slice(0, 300),
        )
        .run();
    }
    return { checked: true, changed };
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO official_log (checked_at, status, fingerprint, titles) VALUES (?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null)
        .run();
    } catch {}
    return { checked: true, changed: false };
  }
}
