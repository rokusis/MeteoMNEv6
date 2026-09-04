import { buildNumericalUrl } from '../sources/numerical/urls';
import { parseNumerical } from '../sources/numerical/parseNumerical';
import { NUMERICAL_STATIONS } from '../sources/numerical/stations';
import { zhmsFetch } from '../lib/http';
export async function runNumericalFull(db: D1Database, model: "a3km"|"e3km"): Promise<number> {
  let ok=0;
  for(const city of Object.keys(NUMERICAL_STATIONS)){
    for(let day=1; day<=5; day++){
      const url=buildNumericalUrl(model as any, city as any, day);
      try{
        const res=await zhmsFetch(url);
        const html=await res.text();
        const p=parseNumerical(html, city, model);
        const now=new Date().toISOString();
        const r=await db.prepare(`INSERT INTO numerical_days (city, model, day_num, date, tmin, tmax, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(city, model, day_num) DO UPDATE SET date=excluded.date, tmin=excluded.tmin, tmax=excluded.tmax, fetched_at=excluded.fetched_at RETURNING id`).bind(city, model, day, p.date||null, p.tmin??null, p.tmax??null, now).first() as any;
        const dayId=r?.id ?? (await db.prepare(`SELECT id FROM numerical_days WHERE city=? AND model=? AND day_num=?`).bind(city, model, day).first() as any)?.id;
        if(!dayId) continue;
        await db.prepare(`DELETE FROM numerical_hours WHERE day_id=?`).bind(dayId).run();
        for(const h of p.hours){
          await db.prepare(`INSERT INTO numerical_hours (day_id, utc_hour, symbol, rr_mm, rh_pct, wind_code) VALUES (?, ?, ?, ?, ?, ?)`).bind(dayId, h.utcHour, h.symbol||null, h.rrMm??null, h.rhPct??null, h.windCode||null).run();
        }
        ok++;
      }catch{}
      await new Promise(r=> setTimeout(r, 80));
    }
  }
  return ok;
}
