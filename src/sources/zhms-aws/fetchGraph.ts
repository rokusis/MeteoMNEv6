import { zhmsFetch } from '../../lib/http';
import { classifyBody } from '../../lib/classify';

export type GraphTip = 'G1' | 'G2' | 'G3';

export function buildGraphUrl(tip: GraphTip, stationId: string): string {
  if (!stationId) throw new Error('stationId required');
  if (!['G1','G2','G3'].includes(tip)) throw new Error('tip must be G1/G2/G3');
  return `https://www.meteo.co.me/Meteorologija/aws-graph.php?v=${tip}&s=${encodeURIComponent(stationId)}`;
}

export async function fetchGraph(tip: GraphTip, stationId: string): Promise<string> {
  const url = buildGraphUrl(tip, stationId);
  const res = await zhmsFetch(url);
  const text = await res.text();
  const kind = classifyBody(text);
  // Za grafik, valid je var DataAll, no_data je prazno
  if (text.includes('var DataAll')) return text;
  if (kind === 'no_data' || text.includes('no data')) throw new Error('no data for graph');
  if (kind === 'empty') throw new Error('empty graph');
  // ako nema DataAll a nije no_data, tretiraj kao invalid da ne prepisemo bazu
  if (!text.includes('DataAll')) throw new Error(`invalid graph kind=${kind}`);
  return text;
}
