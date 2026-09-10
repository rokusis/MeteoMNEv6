import { zhmsFetch } from '../../lib/http';
import { parseHydroStations, parseHydroObs } from './parseHydro';
import { saveStations } from '../../db';
const URL = 'https://www.meteo.co.me/Hidrologija/aws_h.php';
let cache: { stations: any[]; observations: any[]; fetchedAt: string } | null = null;
export async function fetchHydroLive(db?: D1Database): Promise<{ stations: any[]; observations: any[] }> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const stations = parseHydroStations(html);
  const observations = parseHydroObs(html);
  if (!observations.length) throw new Error('hydro empty');
  if (db) {
    try { await saveStations(db, stations as any); } catch {}
  }
  cache = { stations, observations, fetchedAt: new Date().toISOString() };
  return { stations, observations };
}

export async function saveHydro(db: D1Database, stations: any[], observations: any[]): Promise<void> {
  if (!observations.length) return;
  await db.prepare(
    `INSERT INTO hydro_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at, payload=excluded.payload`,
  ).bind(new Date().toISOString(), JSON.stringify({ stations, observations })).run();
}

export async function loadHydro(db: D1Database): Promise<{ stations: any[]; observations: any[]; fetchedAt: string } | null> {
  const row = await db.prepare(`SELECT fetched_at, payload FROM hydro_cache WHERE id=1`).first() as any;
  if (!row?.payload) return null;
  try {
    const p = JSON.parse(row.payload);
    if (!Array.isArray(p?.observations)) return null;
    return { stations: p.stations ?? [], observations: p.observations, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

// DEC-006 zadnje-dobro: kes se prepise samo punim ili vecim skupom.
// Prazan ili okrnjen skup ne sme da obrise dobar kes (isti guard kao SYNOP).
// Provera ide iz baze (radi preko izolata), ne iz memorije.
function hydroSetFp(observations: any[]): string {
  return observations
    .map((o: any) => `${o.stationId}|${o.measuredAtRaw}|${o.waterLevelCm}|${o.waterTempC}`)
    .sort()
    .join(';');
}

export function shouldPersistHydro(
  prev: { stations: any[]; observations: any[] } | null,
  stations: any[],
  observations: any[],
): boolean {
  if (!observations.length) return false;
  if (!prev || !prev.observations.length) return true;
  if (observations.length < prev.observations.length) return false;
  if (observations.length === prev.observations.length) {
    return hydroSetFp(observations) !== hydroSetFp(prev.observations);
  }
  return true;
}

// Za kron na 10 min: reke se menjaju sporo, upis je jedan mali red.
export async function refreshHydro(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchHydroLive();
  let prev: { stations: any[]; observations: any[] } | null = null;
  try {
    prev = await loadHydro(db);
  } catch {}
  if (shouldPersistHydro(prev, r.stations, r.observations)) {
    await saveStations(db, r.stations as any);
    await saveHydro(db, r.stations, r.observations);
  }
  return { updated: r.observations.length > 0 };
}

export async function getHydro(db?: D1Database | null): Promise<{ stations: any[]; observations: any[]; fromCache: boolean; fetchedAt?: string }> {
  if (db) {
    try {
      const c = await loadHydro(db);
      if (c) return { ...c, fromCache: true };
    } catch {}
  }
  try {
    const r = await fetchHydroLive();
    if (db) {
      try {
        const prev = await loadHydro(db);
        if (shouldPersistHydro(prev, r.stations, r.observations)) {
          await saveStations(db, r.stations as any);
          await saveHydro(db, r.stations, r.observations);
        }
      } catch {}
    }
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e) {
    if (cache) return { ...cache, fromCache: true };
    if (db) {
      try {
        const c = await loadHydro(db);
        if (c) return { ...c, fromCache: true };
      } catch {}
    }
    throw e;
  }
}
