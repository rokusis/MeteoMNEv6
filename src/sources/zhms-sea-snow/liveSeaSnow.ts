import { zhmsFetch } from '../../lib/http';
import { parseSeaSnow } from './parseSeaSnow';

const URL = 'https://www.meteo.co.me/Meteorologija/TTRR/sneg-talasi.php';

let cache: { sea: any[]; snow: any[]; fetchedAt: string } | null = null;

export async function fetchSeaSnowLive(): Promise<{ sea: any[]; snow: any[] }> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const { sea, snow } = parseSeaSnow(html);
  cache = { sea, snow, fetchedAt: new Date().toISOString() };
  return { sea, snow };
}

export async function saveSeaSnow(db: D1Database, sea: any[], snow: any[]): Promise<void> {
  await db.prepare(
    `INSERT INTO sea_snow_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at, payload=excluded.payload`,
  ).bind(new Date().toISOString(), JSON.stringify({ sea, snow })).run();
}

export async function loadSeaSnow(db: D1Database): Promise<{ sea: any[]; snow: any[]; fetchedAt: string } | null> {
  const row = await db.prepare(`SELECT fetched_at, payload FROM sea_snow_cache WHERE id=1`).first() as any;
  if (!row?.payload) return null;
  try {
    const p = JSON.parse(row.payload);
    if (!Array.isArray(p?.sea) || !Array.isArray(p?.snow)) return null;
    return { sea: p.sea, snow: p.snow, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

// Otisak za stednju upisa: kes se prepise samo kad se nesto promenilo.
// More se menja ~1 dnevno, slep prepis na 10 min je cisto bacanje upisa.
let lastSeaSnowPersistFp: string | null = null;
function seaSnowPersistFp(sea: any[], snow: any[]): string {
  const s = (sea ?? []).map((x: any) => `${x.place}|${x.tempC}|${x.timeRaw}`).sort().join(';');
  const n = (snow ?? []).map((x: any) => `${x.place}|${x.heightCm}|${x.timeRaw}`).sort().join(';');
  return s + '#' + n;
}

// Za kron na 10 min: more/sneg se menjaju retko, upis je jedan mali red.
export async function refreshSeaSnow(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchSeaSnowLive();
  const fp = seaSnowPersistFp(r.sea, r.snow);
  if (fp !== lastSeaSnowPersistFp) {
    lastSeaSnowPersistFp = fp;
    await saveSeaSnow(db, r.sea, r.snow);
  }
  return { updated: r.sea.length + r.snow.length > 0 };
}

export async function getSeaSnow(db?: D1Database | null): Promise<{ sea: any[]; snow: any[]; fromCache: boolean; fetchedAt?: string }> {
  if (db) {
    try {
      const c = await loadSeaSnow(db);
      if (c) return { ...c, fromCache: true };
    } catch {}
  }
  try {
    const r = await fetchSeaSnowLive();
    if (db) {
      try { await saveSeaSnow(db, r.sea, r.snow); } catch {}
    }
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e) {
    if (cache) return { ...cache, fromCache: true };
    if (db) {
      try {
        const c = await loadSeaSnow(db);
        if (c) return { ...c, fromCache: true };
      } catch {}
    }
    throw e;
  }
}
