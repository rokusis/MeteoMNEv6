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
  if (db) {
    try { await saveStations(db, stations as any); } catch {}
  }
  cache = { stations, observations, fetchedAt: new Date().toISOString() };
  return { stations, observations };
}

export async function saveHydro(db: D1Database, stations: any[], observations: any[]): Promise<void> {
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

// Otisak za stednju upisa: kes se prepise samo kad se nesto promenilo.
// Dnevni limit D1 upisa je 100k, a slep prepis svih stanica na 10 min trosi hiljade.
let lastHydroPersistFp: string | null = null;
function hydroPersistFp(stations: any[], observations: any[]): string {
  return (
    observations
      .map((o: any) => `${o.stationId}|${o.measuredAtRaw}|${o.waterLevelCm}|${o.waterTempC}`)
      .sort()
      .join(';') + '#' + stations.length
  );
}

// Za kron na 10 min: reke se menjaju sporo, upis je jedan mali red.
export async function refreshHydro(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchHydroLive();
  const fp = hydroPersistFp(r.stations, r.observations);
  if (fp !== lastHydroPersistFp) {
    lastHydroPersistFp = fp;
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
    const r = await fetchHydroLive(db ?? undefined);
    if (db) {
      try { await saveHydro(db, r.stations, r.observations); } catch {}
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
