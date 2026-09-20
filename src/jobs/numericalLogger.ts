export async function logNumericalSentinel(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  for (const model of ["e3km","a3km"] as const) {
    const city = "POD";
    const day = 1;
    const letter = model==="a3km"?"A":"E";
    const folder = model==="a3km"?"5danaA":"5danaE";
    const url = `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/${city}-${letter}${day}.html`;
    try {
      let prev: { last_modified: string | null; status: string | null } = { last_modified: null, status: null };
      try {
        const row = await db.prepare(`SELECT last_modified, status FROM numerical_log WHERE city=? AND model=? ORDER BY checked_at DESC LIMIT 1`).bind(city, model).first() as any;
        prev = { last_modified: row?.last_modified ?? null, status: row?.status ?? null };
      } catch {}
      const headers: Record<string,string> = {};
      if (prev.last_modified) headers["If-Modified-Since"] = prev.last_modified;
      const res = await fetch(url, { method: "GET", headers });
      const lm = res.headers.get("last-modified") || res.headers.get("Last-Modified") || prev.last_modified;
      const etag = res.headers.get("etag") || res.headers.get("ETag") || null;
      const status = String(res.status);
      // Pisi samo na promenu/gresku + satni heartbeat da se vidi da merac zivi.
      // Pre je pisao svaki 10-minutni krug i kad nema promene (~288 redova/dan).
      const changed = prev.last_modified !== lm || prev.status !== status;
      const heartbeat = new Date().getUTCMinutes() === 0;
      if (changed || heartbeat || prev.last_modified == null) {
        await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, lm, etag, now, status).run();
      }
      // Puno povlacenje od 125 fajlova je prebaceno na ture sa kursorom
      // (jobs/numericalWatch) jer je ovde pucalo na limitu subrequesta.
      // Merac ostaje, samo vise ne vuce.
    } catch (e:any) {
      await db.prepare(`INSERT INTO numerical_log (city, model, last_modified, etag, checked_at, status) VALUES (?, ?, ?, ?, ?, ?)`).bind(city, model, null, null, now, "error:"+String(e?.message??e).slice(0,120)).run();
    }
  }
}
