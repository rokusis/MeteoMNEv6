export async function saveTimeseries(db: D1Database, stationId: string, param: string, points: {ts:number,value:number|null}[]): Promise<void> {
  for(const p of points){
    if(p.value==null) continue;
    await db.prepare(`INSERT INTO station_timeseries (station_id, ts, param, value) VALUES (?, ?, ?, ?) ON CONFLICT(station_id, ts, param) DO UPDATE SET value=excluded.value`).bind(stationId, p.ts, param, p.value).run();
  }
}
export async function loadTimeseries(db: D1Database, stationId: string, param: string, limit: number = 48): Promise<{ts:number,value:number}[]> {
  const {results} = await db.prepare(`SELECT ts, value FROM station_timeseries WHERE station_id=? AND param=? ORDER BY ts DESC LIMIT ?`).bind(stationId, param, limit).all();
  return (results as any[]).map(r=> ({ts:r.ts, value:r.value})).reverse();
}

export async function loadLatestParams(db: D1Database, params: string[]): Promise<Map<string, Record<string, { ts: number; value: number }>>> {
  const out = new Map<string, Record<string, { ts: number; value: number }>>();
  if (!params.length) return out;
  const placeholders = params.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT station_id, param, value, ts FROM (
       SELECT station_id, param, value, ts, ROW_NUMBER() OVER (PARTITION BY station_id, param ORDER BY ts DESC) AS rn
       FROM station_timeseries WHERE param IN (${placeholders})
     ) WHERE rn = 1`,
  ).bind(...params).all();
  for (const r of results as any[]) {
    const rec = out.get(r.station_id) ?? {};
    rec[r.param] = { ts: r.ts, value: r.value };
    out.set(r.station_id, rec);
  }
  return out;
}
