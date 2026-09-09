import { fetchOfficialLive } from '../sources/zhms-official-forecast/liveOfficial';
import { officialFingerprint } from './officialLogger';

// Gusti prozor za zvanicnu prognozu (sati su UTC).
// Merenje 07-09.09. pokazalo smenu dana ~11:10 i re-izdanje ~12:50,
// pa prozor 10:30-13:30 hvata obe sa marginom od sat vremena.
// Van prozora ostaje postojeci sentinel na 10 min kao sigurnosna mreza.
const OPEN_MIN = 10 * 60 + 30;
const CLOSE_MIN = 13 * 60 + 30;

export function officialWatchOpen(nowMs: number): boolean {
  const d = new Date(nowMs);
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (mins < OPEN_MIN || mins >= CLOSE_MIN) return false;
  return d.getUTCMinutes() % 2 === 0;
}

// Gusti tick: max 1 mali GET po pozivu, D1 upis samo na promenu/gresku
// plus heartbeat na pun sat da se vidi da straza zivi.
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
    const heartbeat = new Date(nowMs).getUTCMinutes() === 0;
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
