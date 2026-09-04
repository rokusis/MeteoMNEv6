import { zhmsFetch } from '../../lib/http';
import { buildNumericalUrl } from './urls';
import { parseNumerical } from './parseNumerical';
import type { StationCode } from './stations';

async function readFromDb(db: D1Database, city: string, model: string, day?: number): Promise<any[] | null> {
  try {
    if (day) {
      const r = await db.prepare(`SELECT id, date, tmin, tmax FROM numerical_days WHERE city=? AND model=? AND day_num=?`).bind(city, model, day).first() as any;
      if (!r) return null;
      const { results } = await db.prepare(`SELECT utc_hour, symbol, rr_mm, rh_pct, wind_code FROM numerical_hours WHERE day_id=? ORDER BY utc_hour`).bind(r.id).all();
      return [{ date: r.date, tmin: r.tmin, tmax: r.tmax, hours: (results as any[]).map(x=> ({ utcHour: String(x.utc_hour).padStart(2,'0'), symbol: x.symbol, rrMm: x.rr_mm, rhPct: x.rh_pct, windCode: x.wind_code })), model, city }];
    } else {
      const { results } = await db.prepare(`SELECT id, date, tmin, tmax, day_num FROM numerical_days WHERE city=? AND model=? ORDER BY day_num`).bind(city, model).all();
      if (!results.length) return null;
      const out:any[]=[];
      for(const row of results as any[]){
        const { results: hrs } = await db.prepare(`SELECT utc_hour, symbol, rr_mm, rh_pct, wind_code FROM numerical_hours WHERE day_id=? ORDER BY utc_hour`).bind(row.id).all();
        out.push({ date: row.date, tmin: row.tmin, tmax: row.tmax, hours: (hrs as any[]).map(x=> ({ utcHour: String(x.utc_hour).padStart(2,'0'), symbol: x.symbol, rrMm: x.rr_mm, rhPct: x.rh_pct, windCode: x.wind_code })), model, city, day_num: row.day_num });
      }
      return out;
    }
  } catch { return null; }
}

export async function fetchNumericalDay(city: StationCode | string, model: "a3km" | "e3km", day: number, db?: D1Database): Promise<any> {
  if (db) {
    const fromDb = await readFromDb(db, String(city).toUpperCase(), model, day);
    if (fromDb && fromDb.length) return fromDb[0];
  }
  const url = buildNumericalUrl(model as any, city as any, day);
  const res = await zhmsFetch(url);
  const html = await res.text();
  return parseNumerical(html, String(city).toUpperCase(), model);
}

export async function fetchNumericalAll(city: StationCode | string, model: "a3km" | "e3km" = "e3km", db?: D1Database): Promise<any[]> {
  if (db) {
    const fromDb = await readFromDb(db, String(city).toUpperCase(), model);
    if (fromDb && fromDb.length) return fromDb;
  }
  const out = [];
  for (let d=1; d<=5; d++) {
    try { out.push(await fetchNumericalDay(city, model, d)); } catch {}
  }
  return out;
}
