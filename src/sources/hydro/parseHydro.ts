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
    const arr = Array.isArray(group) ? group : [];
    for(const r of arr as any[]){
      out.push({ id:String(r[0]).trim(), name:String(r[5]??'').trim(), river:String(r[7]??'').trim()||undefined, lat: r[2]===''?NaN:Number(r[2]), lon: r[3]===''?NaN:Number(r[3]), elevation: r[4]===''?undefined:Number(r[4]) });
    }
  }
  return out.filter(s=>s.id);
}
export function parseHydroObs(html:string): HydroObs[] {
  const m=html.match(POSLJEDNJEH_RE);
  if(!m) throw new Error('var posljednje not found');
  const obj=JSON.parse(cleanJson(m[1])) as Record<string, any>;
  const out: HydroObs[]=[];
  for(const group of Object.values(obj)){
    const entries = Array.isArray(group) ? group : Object.values(group as Record<string, any[]>);
    for(const r of entries as any[]){
      // r je ["tip","ime","vrijeme","vodostaj","temp"] ili sa id na pocetku ako je niz
      if(!Array.isArray(r) || r.length < 3) continue;
      // ako je grupa kao objekat, r nema id na 0, nego je id kljuc - ali u ovom formatu r nema id, id je kljuc
      // medjutim u nasem slucaju r je ["hidrološka (jadranski)","Brodska Njiva","03.09.2026 01:00","5.00","12.80"] - nema id
      // pa moramo naci id preko kljuca - ali Object.values gubi kljuc, pa cemo morati drugacije
      // zato cemo parsirati direktno preko Object.entries
      out.push({ stationId: "", name:String(r[1]??'').trim(), measuredAtRaw:String(r[2]??'').trim(), waterLevelCm: r[3]===''?undefined:Number(r[3]), waterTempC: r[4]===''?undefined:Number(r[4]) });
    }
  }
  // bolje: parsiraj preko entries da dobijemo id
  const obj2=JSON.parse(cleanJson(html.match(POSLJEDNJEH_RE)![1])) as Record<string, Record<string, any[]>>;
  const out2: HydroObs[]=[];
  for(const [basen, stations] of Object.entries(obj2)){
    for(const [sid, r] of Object.entries(stations as Record<string, any[]>)){
      if(!Array.isArray(r)) continue;
      out2.push({ stationId: String(sid).trim(), name:String(r[1]??'').trim(), measuredAtRaw:String(r[2]??'').trim(), waterLevelCm: r[3]===''?undefined:Number(r[3]), waterTempC: r[4]===''?undefined:Number(r[4]) });
    }
  }
  return out2.filter(o=>o.stationId);
}
