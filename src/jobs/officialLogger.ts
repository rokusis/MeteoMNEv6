import { fetchOfficialLive } from '../sources/zhms-official-forecast/liveOfficial';

// Otisak sadrzaja: naslovi + vreme izdavanja. Kad se promeni, prognoza je osvezena.
export function officialFingerprint(o: any): string {
  const days = (o?.days ?? []).map((d: any) => `${d.title ?? ''}|${d.issuedAt ?? ''}`).join(';');
  const sea = o?.seafarer ? `${o.seafarer.title ?? ''}|${o.seafarer.issuedAt ?? ''}` : '';
  return days + '#' + sea;
}

// Privremeni merac 48h: svaki 10-minutni krug zabelezi da li se sadrzaj promenio.
// Posle merenja se poziv iz krona brise, tabela ostaje kao trag.
export async function logOfficialSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
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
    const status = prev == null ? 'first' : prev === fp ? 'same' : 'changed';
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
  } catch (e: any) {
    try {
      await db
        .prepare(`INSERT INTO official_log (checked_at, status, fingerprint, titles) VALUES (?, ?, ?, ?)`)
        .bind(now, 'error:' + String(e?.message ?? e).slice(0, 120), null, null)
        .run();
    } catch {}
  }
}
