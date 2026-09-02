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
