import { zhmsFetch } from '../../lib/http';
import { buildNumericalUrl } from './urls';
import { parseNumerical } from './parseNumerical';
import type { StationCode } from './stations';

export async function fetchNumericalDay(city: StationCode | string, model: "a3km" | "e3km", day: number): Promise<any> {
  const url = buildNumericalUrl(model as any, city as any, day);
  const res = await zhmsFetch(url);
  const html = await res.text();
  if (!html.includes('Tmin') && !html.includes('Tmax')) throw new Error('no Tmin/Tmax in numerical html');
  return parseNumerical(html, String(city).toUpperCase(), model);
}

export async function fetchNumericalAll(city: StationCode | string, model: "a3km" | "e3km" = "e3km"): Promise<any[]> {
  const out = [];
  for (let d=1; d<=5; d++) {
    try {
      const day = await fetchNumericalDay(city, model, d);
      out.push(day);
    } catch (e) {
      // preskoci dan koji nema
    }
  }
  return out;
}
