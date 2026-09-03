export interface SeaPoint { place: string; tempC?: number; timeRaw?: string; }
export interface SnowPoint { place: string; heightCm?: number; tempC?: number; timeRaw?: string; }
function cleanJson(s: string): string {
  return s.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}').replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
}
function parseVarArray(html: string, varName: string): any[] {
  let m = html.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[\\[[\\s\\S]*?\\]\\]);`));
  if (!m) m = html.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[\\[?[\\s\\S]*?\\]\\]?);`));
  if (!m) {
    const m2 = html.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`));
    if (m2) { try { const j=JSON.parse(cleanJson(m2[1])); return Array.isArray(j)?j:[j]; } catch { return []; } }
    return [];
  }
  try { const j=JSON.parse(cleanJson(m[1])); return Array.isArray(j)?j:[]; } catch { return []; }
}
export function parseSea(html: string): SeaPoint[] {
  let arr = parseVarArray(html, 'seaT');
  if (!arr.length) arr = parseVarArray(html, 'seaH');
  return arr.map((r:any[])=> ({ place: String(r[0]??'').trim(), tempC: r[1]===''?undefined:Number(r[1]), timeRaw: r[2]?String(r[2]):undefined })).filter(s=>s.place);
}
export function parseSnow(html: string): SnowPoint[] {
  let arr = parseVarArray(html, 'snowT2');
  if (!arr.length) arr = parseVarArray(html, 'snowH2');
  return arr.map((r:any[])=> ({ place: String(r[0]??'').trim(), heightCm: r[1]===''?undefined:Number(r[1]), tempC: r[2]?Number(r[2]):undefined, timeRaw: r[3]?String(r[3]):undefined })).filter(s=>s.place);
}
export function parseSeaSnow(html: string): { sea: SeaPoint[]; snow: SnowPoint[] } {
  return { sea: parseSea(html), snow: parseSnow(html) };
}
