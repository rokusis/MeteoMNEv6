// Otkucaj kruga: da se vidi da li je krug uopste krenuo i da li je stigao do kraja.
// Ako pocetak tece a kraj kasni, krug umire usput (CPU/vremenski limit).
// Ako stoji i pocetak, cron ne opaljuje. Jedan mali red, bez rasta tabele.
export async function markTickStart(db: any, source: string): Promise<void> {
  try {
    if (!db) return;
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO source_status (source, last_success_at, last_fetched_at, last_error, last_count)
       VALUES (?, (SELECT last_success_at FROM source_status WHERE source=?), ?, NULL, 0)
       ON CONFLICT(source) DO UPDATE SET last_fetched_at=excluded.last_fetched_at, last_error=NULL`,
    ).bind(source, source, now).run();
  } catch {}
}

export async function markTickEnd(db: any, source: string): Promise<void> {
  try {
    if (!db) return;
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO source_status (source, last_success_at, last_fetched_at, last_error, last_count)
       VALUES (?, ?, ?, NULL, 0)
       ON CONFLICT(source) DO UPDATE SET last_success_at=excluded.last_success_at, last_fetched_at=excluded.last_fetched_at, last_error=NULL`,
    ).bind(source, now, now).run();
  } catch {}
}
