export interface HydroStation { id: string; name: string; river?: string; lat: number; lon: number; elevation?: number; }
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
    for(const r of group as any[]){
      out.push({ id:String(r[0]).trim(), name:String(r[5]??'').trim(), river:String(r[7]??'').trim()||undefined, lat:Number(r[2]), lon:Number(r[3]), elevation: r[4]?Number(r[4]):undefined });
    }
  }
  return out.filter(s=>s.id);
}
export function parseHydroObs(html:string): HydroObs[] {
  const m=html.match(POSLJEDNJEH_RE);
  if(!m) throw new Error('var posljednje not found');
  const obj=JSON.parse(cleanJson(m[1])) as Record<string, any[]>;
  const out: HydroObs[]=[];
  for(const group of Object.values(obj)){
    for(const r of group as any[]){
      out.push({ stationId:String(r[0]).trim(), name:String(r[2]??'').trim(), measuredAtRaw:String(r[3]??'').trim(), waterLevelCm: r[4]===''?undefined:Number(r[4]), waterTempC: r[5]===''?undefined:Number(r[5]) });
    }
  }
  return out.filter(o=>o.stationId);
}
