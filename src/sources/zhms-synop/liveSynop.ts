import { zhmsFetch } from '../../lib/http';
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

export async function getSynop(): Promise<{ meta: any; stations: any[]; fromCache: boolean; fetchedAt?: string; error?: string }> {
  try {
    const r = await fetchSynopLive();
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e: any) {
    lastError = String(e?.message ?? e);
    if (cache) return { ...cache, fromCache: true, error: lastError };
    throw e;
  }
}

export function getSynopCache() { return cache; }
export function getSynopLastError() { return lastError; }
