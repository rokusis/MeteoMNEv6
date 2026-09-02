export type GraphParam = 'T' | 'H' | 'RR' | 'BRV' | 'PRV' | 'MUV' | 'GR' | 'P';
export interface TimePoint { ts: number; value: number | null; }
export type DataAll = Partial<Record<GraphParam, TimePoint[]>>;
const DATAALL_RE = /var\s+DataAll\s*=\s*(\{[\s\S]*?\});/;
function cleanJson(s: string): string {
  // dodaj navodnike oko G1, G2, G3, T, H, RR... i ocisti zareze
  let r = s.replace(/([{,]\s*)([A-Z0-9_]+)\s*:/g, '$1"$2":');
  r = r.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
  return r;
}
export function parseDataAll(rawHtml: string): DataAll {
  const m = rawHtml.match(DATAALL_RE);
  if (!m) throw new Error('var DataAll not found');
  const jsonStr = cleanJson(m[1]);
  const obj = JSON.parse(jsonStr) as any;
  const out: DataAll = {};
  // DataAll je {G1:{T:[], H:[], RR:[]}, G2:{BRV:[], PRV:[], MUV:[]}, G3:{GR:[], P:[]}}
  const flat: Record<string, any[]> = {};
  if (obj.G1) Object.assign(flat, obj.G1);
  if (obj.G2) Object.assign(flat, obj.G2);
  if (obj.G3) Object.assign(flat, obj.G3);
  // ako je vec flat (stari format), koristi direktno
  if (!obj.G1 && !obj.G2 && !obj.G3) Object.assign(flat, obj);
  for (const [k, arr] of Object.entries(flat)) {
    if (!Array.isArray(arr)) continue;
    (out as any)[k] = (arr as any[]).map(([ts, val]: any[]) => ({
      ts: Number(ts),
      value: val === '' || val == null ? null : Number(val),
    })).filter(p => Number.isFinite(p.ts));
  }
  return out;
}
