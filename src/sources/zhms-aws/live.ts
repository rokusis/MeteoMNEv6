import { zhmsFetch } from '../../lib/http';
import { classifyBody } from '../../lib/classify';
import { parseStations } from './parseStations';
import { parseObservations } from './parseObservations';
import { normalizeObservations } from './normalize';
import { saveStations, saveObservations, saveSourceStatus, loadObservations } from '../../db';

const AWS_URL = 'https://www.meteo.co.me/Meteorologija/aws_m.php';

let memCache: { obs: any[]; fetchedAt: string } | null = null;

// Otisak jedne stanice: cela bulk tabela se menja cim se JEDNA stanica
// pomeri, pa poredjenje celog bulka pise svih 37 svaki put (65k upisa/dan).
// Zato se pamti otisak po stanici, a pisu se samo promenjene.
export function bulkFingerprint(obs: any[]): string {
  return obs
    .map((o: any) =>
      [o.stationId, o.measuredAtRaw, o.temperatureC, o.precipitationMm, o.windSpeedMs, o.windDirectionCode, o.gustMs].join('|'),
    )
    .sort()
    .join(';');
}

export function stationFingerprint(o: any): string {
  return [o.measuredAtRaw, o.temperatureC, o.precipitationMm, o.windSpeedMs, o.windDirectionCode, o.gustMs].join('|');
}

async function loadBulkFingerprints(db: D1Database): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const { results } = (await db.prepare(`SELECT source, fingerprint FROM bulk_state WHERE source LIKE 'aws:%'`).all()) as any;
    for (const r of (results ?? []) as any[]) m.set(String(r.source).slice(4), r.fingerprint);
  } catch {}
  return m;
}

async function saveBulkFingerprints(db: D1Database, entries: [string, string][]): Promise<void> {
  const now = new Date().toISOString();
  for (const [id, fp] of entries) {
    try {
      await db
        .prepare(
          `INSERT INTO bulk_state (source, fingerprint, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(source) DO UPDATE SET fingerprint=excluded.fingerprint, updated_at=excluded.updated_at`,
        )
        .bind('aws:' + id, fp, now)
        .run();
    } catch {}
  }
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
    const prev = await loadBulkFingerprints(db);
    const obsById = new Map(normalized.map((o: any) => [o.stationId, o]));
    const changedIds = new Set<string>();
    for (const o of normalized as any[]) {
      if (prev.get(o.stationId) !== stationFingerprint(o)) changedIds.add(o.stationId);
    }
    if (changedIds.size > 0) {
      const changedStations = stations.filter((s: any) => changedIds.has(s.stationId));
      const changedObs = (normalized as any[]).filter((o: any) => changedIds.has(o.stationId));
      await saveStations(db, changedStations);
      await saveObservations(db, changedObs);
      await saveBulkFingerprints(
        db,
        [...changedIds].map((id) => [id, stationFingerprint(obsById.get(id))] as [string, string]),
      );
    }
    await saveSourceStatus(db, 'aws', normalized.length, null);
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
