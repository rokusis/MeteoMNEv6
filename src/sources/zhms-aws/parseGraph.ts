export type GraphParam = 'T' | 'H' | 'RR' | 'BRV' | 'PRV' | 'MUV' | 'GR' | 'P';
export interface TimePoint { ts: number; value: number | null; }
export type DataAll = Partial<Record<GraphParam, TimePoint[]>>;

const DATAALL_RE = /var\s+DataAll\s*=\s*(\{[\s\S]*?\});/;

function cleanJson(s: string): string {
  return s.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
}

export function parseDataAll(rawHtml: string): DataAll {
  const m = rawHtml.match(DATAALL_RE);
  if (!m) throw new Error('var DataAll not found');
  const jsonStr = cleanJson(m[1]);
  const obj = JSON.parse(jsonStr) as Record<string, any[]>;
  const out: DataAll = {};
  for (const [k, arr] of Object.entries(obj)) {
    if (!Array.isArray(arr)) continue;
    out[k as GraphParam] = arr.map(([ts, val]: any[]) => ({
      ts: Number(ts),
      value: val === '' || val == null ? null : Number(val),
    })).filter(p => Number.isFinite(p.ts));
  }
  return out;
}
