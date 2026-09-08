import { zhmsFetch } from '../../lib/http';
import { classifyBody } from '../../lib/classify';
import { parseStations } from './parseStations';
import { parseObservations } from './parseObservations';
import { normalizeObservations } from './normalize';
import { saveStations, saveObservations, saveSourceStatus, loadObservations } from '../../db';

const AWS_URL = 'https://www.meteo.co.me/Meteorologija/aws_m.php';

let memCache: { obs: any[]; fetchedAt: string } | null = null;

// Otisak celog bulka: ako se nista nije promenilo, preskacemo 74 upisa,
// samo otkucamo da se zna da je krug radio. Trosi deseti deo kvote.
export function bulkFingerprint(obs: any[]): string {
  return obs
    .map((o: any) =>
      [o.stationId, o.measuredAtRaw, o.temperatureC, o.precipitationMm, o.windSpeedMs, o.windDirectionCode, o.gustMs].join('|'),
    )
    .sort()
    .join(';');
}

async function loadBulkFingerprint(db: D1Database): Promise<string | null> {
  try {
    const r = (await db.prepare(`SELECT fingerprint FROM bulk_state WHERE source='aws'`).first()) as any;
    return r?.fingerprint ?? null;
  } catch {
    return null;
  }
}

async function saveBulkFingerprint(db: D1Database, fp: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO bulk_state (source, fingerprint, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(source) DO UPDATE SET fingerprint=excluded.fingerprint, updated_at=excluded.updated_at`,
      )
      .bind('aws', fp, now)
      .run();
  } catch {}
}

export async function fetchAndPersist(db: D1Database): Promise<any[]> {
  const res = await zhmsFetch(AWS_URL);
  const text = await res.text();
  const kind = classifyBody(text);
  if (kind !== 'valid') throw new Error(`AWS invalid kind=${kind}`);
  const stations = parseStations(text);
  const rawObs = parseObservations(text);
  const normalized = normalizeObservations(stations, rawObs);
  if (normalized.length === 0) throw new Error('no normalized');
  if (db) {
    const fp = bulkFingerprint(normalized);
    let prev: string | null = null;
    try {
      prev = await loadBulkFingerprint(db);
    } catch {}
    if (prev != null && prev === fp) {
      await saveSourceStatus(db, 'aws', normalized.length, null);
      memCache = { obs: normalized, fetchedAt: new Date().toISOString() };
      return normalized;
    }
    await saveStations(db, stations);
    await saveObservations(db, normalized);
    await saveSourceStatus(db, 'aws', normalized.length, null);
    await saveBulkFingerprint(db, fp);
  }
  memCache = { obs: normalized, fetchedAt: new Date().toISOString() };
  return normalized;
}

export async function getObservations(db: D1Database): Promise<{ observations: any[]; fromCache: boolean; fetchedAt?: string; error?: string }> {
  if (db) {
    try {
      const st = await db.prepare(`SELECT last_success_at as lastOk FROM source_status WHERE source='aws'`).first() as any;
      const fromDb = await loadObservations(db);
      if (fromDb.length > 0) {
        const ageMs = st?.lastOk ? Date.now() - Date.parse(st.lastOk) : Infinity;
        if (Number.isFinite(ageMs) && ageMs < 10 * 60 * 1000) return { observations: fromDb, fromCache: true, fetchedAt: st.lastOk };
        if (!Number.isFinite(ageMs)) return { observations: fromDb, fromCache: true };
      }
    } catch {}
  }
  try {
    const obs = await fetchAndPersist(db);
    return { observations: obs, fromCache: false, fetchedAt: memCache!.fetchedAt };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (db) {
      try {
        await saveSourceStatus(db, 'aws', 0, msg);
        const fromDb = await loadObservations(db);
        if (fromDb.length > 0) return { observations: fromDb, fromCache: true, error: msg };
      } catch {}
    }
    if (memCache) return { observations: memCache.obs, fromCache: true, fetchedAt: memCache.fetchedAt, error: msg };
    throw e;
  }
}
export function getCache() { return memCache ? { observations: memCache.obs, fetchedAt: memCache.fetchedAt } : null; }
