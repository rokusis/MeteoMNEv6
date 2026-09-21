import { zhmsFetch } from '../../lib/http';
import { parseOfficial } from './parseOfficial';
const URL = 'https://www.meteo.co.me/page.php?id=31';
let cache: any = null;
export async function fetchOfficialLive(): Promise<any> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const parsed = parseOfficial(html);
  cache = { ...parsed, fetchedAt: new Date().toISOString() };
  return cache;
}

export async function saveOfficial(db: D1Database, forecast: any): Promise<void> {
  const days = forecast?.days ?? [];
  if (!days.length) return;
  await db.prepare(
    `INSERT INTO official_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at, payload=excluded.payload`,
  ).bind(new Date().toISOString(), JSON.stringify(forecast)).run();
}

export async function loadOfficial(db: D1Database): Promise<any | null> {
  const row = await db.prepare(`SELECT fetched_at, payload FROM official_cache WHERE id=1`).first() as any;
  if (!row?.payload) return null;
  try {
    const p = JSON.parse(row.payload);
    if (!Array.isArray(p?.days) || !p.days.length) return null;
    return { ...p, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

// DEC-006 zadnje-dobro: kes se prepise samo punim ili vecim skupom dana.
// Manji skup ne sme da obrise dobar kes. Provera ide iz baze.
export function shouldPersistOfficial(prev: any | null, forecast: any): boolean {
  const days = forecast?.days ?? [];
  if (!days.length) return false;
  if (!prev || !(prev.days ?? []).length) return true;
  if (days.length < prev.days.length) return false;
  return true;
}

// Za kron na 10 min: zvanicna se menja 1-2 puta dnevno, upis je jedan mali red.
export async function refreshOfficial(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchOfficialLive();
  let prev: any | null = null;
  try {
    prev = await loadOfficial(db);
  } catch {}
  if (shouldPersistOfficial(prev, r)) {
    await saveOfficial(db, r);
  }
  return { updated: (r.days ?? []).length > 0 };
}

export async function getOfficial(db?: D1Database | null): Promise<any> {
  if (db) {
    try {
      const c = await loadOfficial(db);
      if (c) return { ...c, fromCache: true };
    } catch {}
  }
  try {
    const r = await fetchOfficialLive();
    if (db) {
      try {
        const prev = await loadOfficial(db);
        if (shouldPersistOfficial(prev, r)) {
          await saveOfficial(db, r);
        }
      } catch {}
    }
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e: any) {
    if (cache) return { ...cache, fromCache: true };
    if (db) {
      try {
        const c = await loadOfficial(db);
        if (c) return { ...c, fromCache: true };
      } catch {}
    }
    throw e;
  }
}
