import { zhmsFetch } from '../../lib/http';
import { parseAir, type AirStation } from './parseAir';

const URL = 'https://www.epa.org.me/vazduh/';

// Jedan GET na glavnu stranu daje sve stanice odjednom.
// Nema potrebe da se gadja svaka stanica posebno.
export async function fetchAirLive(): Promise<{ stations: AirStation[] }> {
  const res = await zhmsFetch(URL);
  if (!res.ok) throw new Error('air http ' + res.status);
  const html = await res.text();
  const stations = parseAir(html);
  return { stations };
}

export async function saveAir(db: D1Database, stations: AirStation[]): Promise<void> {
  if (!stations.length) return;
  await db.prepare(
    `INSERT INTO air_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at, payload=excluded.payload`,
  ).bind(new Date().toISOString(), JSON.stringify({ stations })).run();
}

export async function loadAir(db: D1Database): Promise<{ stations: AirStation[]; fetchedAt: string } | null> {
  const row = await db.prepare(`SELECT fetched_at, payload FROM air_cache WHERE id=1`).first() as any;
  if (!row?.payload) return null;
  try {
    const p = JSON.parse(row.payload);
    if (!Array.isArray(p?.stations) || !p.stations.length) return null;
    return { stations: p.stations, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

// DEC-006 zadnje-dobro: kes se prepise samo punim ili vecim skupom.
// Manji skup ne sme da obrise dobar kes (9 stanica sad, bilo 10).
export function shouldPersistAir(prev: { stations: AirStation[] } | null, stations: AirStation[]): boolean {
  if (!stations.length) return false;
  if (!prev || !prev.stations.length) return true;
  if (stations.length < prev.stations.length) return false;
  return true;
}

// Za 4-minutni ritam (odluka vlasnika: kasnjenje do ~4 min): upis je 1 mali red.
export async function refreshAir(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchAirLive();
  let prev: { stations: AirStation[] } | null = null;
  try {
    prev = await loadAir(db);
  } catch {}
  if (shouldPersistAir(prev, r.stations)) {
    await saveAir(db, r.stations);
  }
  return { updated: r.stations.length > 0 };
}

export async function getAir(db?: D1Database | null): Promise<{ stations: AirStation[]; fromCache: boolean; fetchedAt?: string }> {
  if (db) {
    try {
      const c = await loadAir(db);
      if (c) return { ...c, fromCache: true };
    } catch {}
  }
  try {
    const r = await fetchAirLive();
    if (db) {
      try {
        const prev = await loadAir(db);
        if (shouldPersistAir(prev, r.stations)) {
          await saveAir(db, r.stations);
        }
      } catch {}
    }
    return { ...r, fromCache: false, fetchedAt: new Date().toISOString() };
  } catch (e: any) {
    if (db) {
      try {
        const c = await loadAir(db);
        if (c) return { ...c, fromCache: true };
      } catch {}
    }
    throw e;
  }
}
