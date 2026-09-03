import { zhmsFetch } from '../../lib/http';
import { parseHydroStations, parseHydroObs } from './parseHydro';
const URL = 'https://www.meteo.co.me/Hidrologija/aws_h.php';
let cache: { stations: any[]; observations: any[]; fetchedAt: string } | null = null;
export async function fetchHydroLive(): Promise<{ stations: any[]; observations: any[] }> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const stations = parseHydroStations(html);
  const observations = parseHydroObs(html);
  cache = { stations, observations, fetchedAt: new Date().toISOString() };
  return { stations, observations };
}
export async function getHydro(): Promise<{ stations: any[]; observations: any[]; fromCache: boolean; fetchedAt?: string }> {
  try {
    const r = await fetchHydroLive();
    return { ...r, fromCache: false, fetchedAt: cache!.fetchedAt };
  } catch (e) {
    if (cache) return { ...cache, fromCache: true };
    throw e;
  }
}
