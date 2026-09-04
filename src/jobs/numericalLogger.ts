import { runNumericalFull } from './numericalCron';
export async function logNumericalSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  for (const model of ["e3km","a3km"] as const) {
    const city = "POD";
    const day = 1;
    const letter = model==="a3km"?"A":"E";
    const folder = model==="a3km"?"5danaA":"5danaE";
    const url = `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/${city}-${letter}${day}.html`;
    try {
      let lastMod: string | null = null;
      try {
        const row = await db.prepare(`SELECT last_modified FROM numerical_log WHERE city=? AND model=? ORDER BY checked_at DESC LIMIT 1`).bind(city, model).first() as any;
        lastMod = row?.last_modified || null;
      } catch {}
      const headers: Record<string,string> = {};
      if (lastMod) headers["If-Modified-Since"] = lastMod;
      const res = await fetch(url, { method: "GET", headers });
      const lm = res.headers.get("last-modified") || res.headers.get("Last-Modified") || lastMod;
      const etag = res.headers.get("etag") || res.headers.get("ETag") || null;
      const status = String(res.status);
      await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, lm, etag, now, status).run();
      if (res.status===200) {
        // novi batch - povuci sve
        await runNumericalFull(db, model);
      }
    } catch (e:any) {
      await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, null, null, now, "error:"+String(e?.message??e).slice(0,120)).run();
    }
  }
}
