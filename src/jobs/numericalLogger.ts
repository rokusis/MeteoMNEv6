export async function logNumericalSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  for (const model of ["e3km","a3km"] as const) {
    const city = "POD";
    const day = 1;
    const letter = model==="a3km"?"A":"E";
    const folder = model==="a3km"?"5danaA":"5danaE";
    const url = `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/${city}-${letter}${day}.html`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      const lm = res.headers.get("last-modified") || res.headers.get("Last-Modified") || null;
      const etag = res.headers.get("etag") || res.headers.get("ETag") || null;
      const status = String(res.status);
      await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, lm, etag, now, status).run();
    } catch (e:any) {
      await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, null, null, now, "error:"+String(e?.message??e).slice(0,120)).run();
    }
  }
}
