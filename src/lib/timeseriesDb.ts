export async function saveTimeseries(db: D1Database, stationId: string, param: string, points: {ts:number,value:number|null}[]): Promise<void> {
  for(const p of points){
    if(p.value==null) continue;
    await db.prepare(`INSERT INTO station_timeseries (station_id, ts, param, value) VALUES (?, ?, ?, ?) ON CONFLICT(station_id, ts, param) DO UPDATE SET value=excluded.value`).bind(stationId, p.ts, param, p.value).run();
  }
}

// Grupni upis: stotine poziva stanemo u par serija umesto stotine krugova.
// Jedna serija = jedan odlazak do baze. Na gresku pada nazad na obican upis.
// Vraca broj sacuvanih tacaka; uz deadline staje ranije (ostatak sledeci krug).
export async function saveTimeseriesBatch(db: D1Database, stationId: string, param: string, points: {ts:number,value:number|null}[], chunkSize: number = 40, deadlineMs: number = 0): Promise<number> {
  const clean = points.filter((p) => p.value != null);
  if (!clean.length) return 0;
  const stmts = clean.map((p) =>
    db.prepare(`INSERT INTO station_timeseries (station_id, ts, param, value) VALUES (?, ?, ?, ?) ON CONFLICT(station_id, ts, param) DO UPDATE SET value=excluded.value`).bind(stationId, p.ts, param, p.value as number),
  );
  let saved = 0;
  let stopped = false;
  try {
    for (let i = 0; i < stmts.length; i += chunkSize) {
      if (deadlineMs && Date.now() > deadlineMs) {
        stopped = true;
        break;
      }
      await db.batch(stmts.slice(i, i + chunkSize));
      saved += Math.min(chunkSize, stmts.length - i);
    }
    if (saved >= stmts.length) return saved;
  } catch {}
  if (stopped || saved > 0) return saved;
  await saveTimeseries(db, stationId, param, points);
  return clean.length;
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
