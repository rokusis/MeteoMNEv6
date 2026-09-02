import { zhmsFetch } from '../../lib/http';
import { classifyBody } from '../../lib/classify';
import { parseStations } from './parseStations';
import { parseObservations } from './parseObservations';
import { normalizeObservations, type NormalizedObservation } from './normalize';

const AWS_URL = 'https://www.meteo.co.me/Meteorologija/aws_m.php';

let cache: { observations: NormalizedObservation[]; fetchedAt: string; source: string } | null = null;
let lastError: string | null = null;

export async function fetchAwsLive(): Promise<NormalizedObservation[]> {
  const res = await zhmsFetch(AWS_URL);
  const text = await res.text();
  const kind = classifyBody(text);
  if (kind !== 'valid') throw new Error(`AWS invalid kind=${kind} status=${res.status} body=${text.slice(0,120)}`);
  const stations = parseStations(text);
  const rawObs = parseObservations(text);
  const normalized = normalizeObservations(stations, rawObs);
  if (normalized.length === 0) throw new Error('AWS no normalized observations');
  cache = { observations: normalized, fetchedAt: new Date().toISOString(), source: AWS_URL };
  lastError = null;
  return normalized;
}

export function getCache() { return cache; }
export function getLastError() { return lastError; }
export function setCacheForTest(c: any) { cache = c; }
export async function getObservationsWithCache(): Promise<{ observations: NormalizedObservation[]; fromCache: boolean; fetchedAt?: string; error?: string }> {
  try {
    const obs = await fetchAwsLive();
    return { observations: obs, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e: any) {
    lastError = String(e?.message ?? e);
    // Ako je TLS problem u lokalnom dev okruzenju, vrati citljiv error
    if (lastError.toLowerCase().includes('certificate') || lastError.toLowerCase().includes('ssl')) {
      lastError = 'TLS cert problem u lokalnom dev (Codespace) - na pravom Cloudflare Workers ce raditi. Probaj deploy. Detalj: ' + lastError;
    }
    if (cache) return { observations: cache.observations, fromCache: true, fetchedAt: cache.fetchedAt, error: lastError };
    throw new Error(lastError);
  }
}
