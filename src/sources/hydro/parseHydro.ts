export interface HydroStation { id: string; wmoId?: string; lat: number; lon: number; elevation?: number; name: string; stationType?: string; river?: string; flag?: number | string; }
export interface HydroObs { stationId: string; name: string; measuredAtRaw: string; waterLevelCm?: number; waterTempC?: number; }
const STANICEH_RE = /var\s+staniceH\s*=\s*(\{[\s\S]*?\});/;
const POSLJEDNJEH_RE = /var\s+posljednje\s*=\s*(\{[\s\S]*?\});/;
function cleanJson(s:string){ return s.replace(/,\s*]/g,']').replace(/,\s*}/g,'}').replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g,'$1"$2":').replace(/'/g,'"'); }
export function parseHydroStations(html:string): HydroStation[] {
  const m=html.match(STANICEH_RE);
  if(!m) throw new Error('var staniceH not found');
  const obj=JSON.parse(cleanJson(m[1])) as Record<string, any[]>;
  const out: HydroStation[]=[];
  for(const group of Object.values(obj)){
    const arr = Array.isArray(group) ? group : [];
    for(const r of arr as any[]){
      out.push({ id:String(r[0]).trim(), wmoId: String(r[1]??'').trim()||undefined, lat: r[2]===''?NaN:Number(r[2]), lon: r[3]===''?NaN:Number(r[3]), elevation: r[4]===''?undefined:Number(r[4]), name:String(r[5]??'').trim(), stationType:String(r[6]??'').trim()||undefined, river:String(r[7]??'').trim()||undefined, flag:r[8] });
    }
  }
  return out.filter(s=>s.id);
}
export function parseHydroObs(html:string): HydroObs[] {
  const m=html.match(POSLJEDNJEH_RE);
  if(!m) throw new Error('var posljednje not found');
  const obj=JSON.parse(cleanJson(m[1])) as Record<string, Record<string, any[]>>;
  const out: HydroObs[]=[];
  for(const stations of Object.values(obj)){
    for(const [sid, r] of Object.entries(stations as Record<string, any[]>)){
      if(!Array.isArray(r)) continue;
      out.push({ stationId: String(sid).trim(), name:String(r[1]??'').trim(), measuredAtRaw:String(r[2]??'').trim(), waterLevelCm: r[3]===''?undefined:Number(r[3]), waterTempC: r[4]===''?undefined:Number(r[4]) });
    }
  }
  return out.filter(o=>o.stationId);
}
