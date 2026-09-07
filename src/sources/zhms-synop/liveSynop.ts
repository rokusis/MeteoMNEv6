import { zhmsFetch } from '../../lib/http';
import { podgoricaLocal } from '../zhms-aws/graphSchedule';
import { parseSynop } from './parseSynop';
import { synopKind } from './weatherKind';
import { fullWeatherText } from './weatherFull';

const SYNOP_URL = 'https://www.meteo.co.me/synopT.php';

let cache: { meta: any; stations: any[]; fetchedAt: string } | null = null;
let lastError: string | null = null;

export async function fetchSynopLive(): Promise<{ meta: any; stations: any[] }> {
  const res = await zhmsFetch(SYNOP_URL);
  const text = await res.text();
  if (!text.includes('var sinop')) throw new Error('SYNOP invalid kind status=' + res.status);
  const parsed = parseSynop(text);
  if (!parsed.stations.length) throw new Error('SYNOP empty');
  const stations = parsed.stations.map(s => {
    const k = synopKind(s.ww, s.obl, s.VBNobl);
    const fullText = fullWeatherText(text, s.ww, s.obl, s.VBNobl);
    const finalText = fullText ?? k.text;
    return { ...s, synopText: finalText, synopSymbolIndex: k.symbolIndex, synopStatus: finalText ? 'OK' : 'UNRESOLVED' };
  });
  cache = { meta: parsed.meta, stations, fetchedAt: new Date().toISOString() };
  lastError = null;
  return { meta: parsed.meta, stations };
}

export async function saveSynop(db: D1Database, meta: any, stations: any[]): Promise<void> {
  if (!stations.length) return;
  await db.prepare(
    `INSERT INTO synop_cache (id, meta_hour, meta_day, fetched_at, payload)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET meta_hour=excluded.meta_hour, meta_day=excluded.meta_day, fetched_at=excluded.fetched_at, payload=excluded.payload`,
  ).bind(meta?.hour ?? null, meta?.day ?? null, new Date().toISOString(), JSON.stringify(stations)).run();
}

export async function loadSynop(db: D1Database): Promise<{ meta: any; stations: any[]; fetchedAt: string } | null> {
  const row = await db.prepare(`SELECT meta_hour, meta_day, fetched_at, payload FROM synop_cache WHERE id=1`).first() as any;
  if (!row?.payload) return null;
  try {
    const stations = JSON.parse(row.payload);
    if (!Array.isArray(stations) || !stations.length) return null;
    return { meta: { hour: row.meta_hour, day: row.meta_day }, stations, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

// Za kron: upise samo kad stigne nov termin (07/14/21), inace nista ne dira.
export async function refreshSynop(db: D1Database): Promise<{ updated: boolean }> {
  const r = await fetchSynopLive();
  let prev: { meta: any } | null = null;
  try {
    prev = await loadSynop(db);
  } catch {}
  if (prev && prev.meta?.hour === r.meta?.hour && prev.meta?.day === r.meta?.day) {
    return { updated: false };
  }
  await saveSynop(db, r.meta, r.stations);
  return { updated: true };
}

export async function getSynop(db?: D1Database | null): Promise<{ meta: any; stations: any[]; fromCache: boolean; fetchedAt?: string; error?: string }> {
  if (db) {
    try {
      const c = await loadSynop(db);
      if (c) return { ...c, fromCache: true };
    } catch {}
  }
  try {
    const r = await fetchSynopLive();
    if (db) {
      try {
        await saveSynop(db, r.meta, r.stations);
      } catch {}
    }
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e: any) {
    lastError = String(e?.message ?? e);
    if (cache) return { ...cache, fromCache: true, error: lastError };
    if (db) {
      try {
        const c = await loadSynop(db);
        if (c) return { ...c, fromCache: true, error: lastError };
      } catch {}
    }
    throw e;
  }
}

export function getSynopCache() { return cache; }
export function getSynopLastError() { return lastError; }

// Gusta straza samo oko sinoptickih termina 07/14/21 (lokalno):
// promena tipa "sunce u kisu u 14:01" lovi se za 2-3 min, van prozora
// redovna 10-minutna provera je mreza.
export function synopWatchOpen(nowMs: number = Date.now()): boolean {
  const { hour, minute } = podgoricaLocal(nowMs);
  const m = hour * 60 + minute;
  return (m >= 390 && m < 510) || (m >= 810 && m < 930) || (m >= 1230 && m < 1350);
}
