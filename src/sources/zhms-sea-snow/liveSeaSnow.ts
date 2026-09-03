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

export async function getSeaSnow(): Promise<{ sea: any[]; snow: any[]; fromCache: boolean; fetchedAt?: string }> {
  try {
    const r = await fetchSeaSnowLive();
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e) {
    if (cache) return { ...cache, fromCache: true };
    throw e;
  }
}
