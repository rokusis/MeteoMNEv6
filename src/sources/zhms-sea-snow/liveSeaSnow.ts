import { zhmsFetch } from '../../lib/http';
import { parseSeaSnow } from './parseSeaSnow';

const URL = 'https://www.meteo.co.me/Meteorologija/TTRR/sneg-talasi.php';

let cache: { sea: any[]; snow: any[]; fetchedAt: string } | null = null;

export async function fetchSeaSnowLive(): Promise<{ sea: any[]; snow: any[] }> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const { sea, snow } = parseSeaSnow(html);
  if (!sea.length && !snow.length) throw new Error('sea-snow empty');
  cache = { sea, snow, fetchedAt: new Date().toISOString() };
  return { sea, snow };
}

export async function saveSeaSnow(db: D1Database, sea: any[], snow: any[]): Promise<void> {
  if (!sea.length && !snow.length) return;
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

// DEC-006 zadnje-dobro: kes se prepise samo punim ili vecim skupom.
// Prazan ili okrnjen skup ne sme da obrise dobar kes (isti guard kao SYNOP).
// Provera ide iz baze (radi preko izolata), ne iz memorije.
function seaSnowSetFp(sea: any[], snow: any[]): string {
  const s = (sea ?? []).map((x: any) => `${x.place}|${x.tempC}|${x.timeRaw}`).sort().join(';');
  const n = (snow ?? []).map((x: any) => `${x.place}|${x.heightCm}|${x.timeRaw}`).sort().join(';');
  return s + '#' + n;
}

function seaSnowCount(sea: any[], snow: any[]): number {
  return (sea ?? []).length + (snow ?? []).length;
}

export function shouldPersistSeaSnow(
  prev: { sea: any[]; snow: any[] } | null,
  sea: any[],
  snow: any[],
): boolean {
  if (seaSnowCount(sea, snow) === 0) return false;
  if (!prev || seaSnowCount(prev.sea, prev.snow) === 0) return true;
  if (seaSnowCount(sea, snow) < seaSnowCount(prev.sea, prev.snow)) return false;
  if (seaSnowCount(sea, snow) === seaSnowCount(prev.sea, prev.snow)) {
    return seaSnowSetFp(sea, snow) !== seaSnowSetFp(prev.sea, prev.snow);
  }
  return true;
}

// Za kron na 10 min: more/sneg se menjaju retko, upis je jedan mali red.
export async function refreshSeaSnow(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchSeaSnowLive();
  let prev: { sea: any[]; snow: any[] } | null = null;
  try {
    prev = await loadSeaSnow(db);
  } catch {}
  if (shouldPersistSeaSnow(prev, r.sea, r.snow)) {
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
      try {
        const prev = await loadSeaSnow(db);
        if (shouldPersistSeaSnow(prev, r.sea, r.snow)) {
          await saveSeaSnow(db, r.sea, r.snow);
        }
      } catch {}
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
