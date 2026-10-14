// dnevni: dnevni min/max temperature po stanici. Poziva je pg_cron jednom
// nocu (00:10 lokalno). Racuna iz nase istorije, nista novo sa izvora.
// Dan je od ponoci do ponoci nase vreme. Greska se upise, nikad ne baca.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sb(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(SB_URL.replace(/\/$/, "") + path, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error("sb " + res.status);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}
// Lokalno vreme Podgorice: +2 leti (do 25.10), +1 zimi. Dan je od ponoci
// do ponoci lokalno. Vracene granice su UTC milisekunde.
function localDayRange(daysAgo: number, nowMs: number = Date.now()): { dan: string; fromMs: number; toMs: number } {
  const now = new Date(nowMs);
  const dstStart = Date.UTC(now.getUTCFullYear(), 2, 29, 1, 0);
  const dstEnd = Date.UTC(now.getUTCFullYear(), 9, 25, 1, 0);
  const off = nowMs >= dstStart && nowMs < dstEnd ? 2 : 1;
  const utcMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const fromMs = utcMid - daysAgo * 86400000 - off * 3600000;
  const toMs = fromMs + 86400000;
  const label = new Date(fromMs + off * 3600000);
  const dan = `${String(label.getUTCDate()).padStart(2, "0")}.${String(label.getUTCMonth() + 1).padStart(2, "0")}.${label.getUTCFullYear()}`;
  return { dan, fromMs, toMs: fromMs + 86400000 };
}

Deno.serve(async () => {
  const now = new Date().toISOString();
  try {
    for (const daysAgo of [1, 0]) {
      const { dan, fromMs, toMs } = localDayRange(daysAgo);
      const rows: any[] = await sb(
        `/rest/v1/station_timeseries?select=station_id,ts,value&param=eq.T&ts=gte.${fromMs}&ts=lt.${toMs}&order=ts.asc&limit=20000`
      );
      const bySt = new Map<string, any[]>();
      for (const r of rows ?? []) {
        if (r.value == null) continue;
        if (!bySt.has(r.station_id)) bySt.set(r.station_id, []);
        bySt.get(r.station_id)!.push(r);
      }
      for (const [sid, pts] of bySt) {
        let mn = pts[0], mx = pts[0];
        for (const p of pts) {
          if (p.value < mn.value) mn = p;
          if (p.value > mx.value) mx = p;
        }
        await sb("/rest/v1/dnevni_min_max?on_conflict=station_id,dan", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            station_id: sid, dan,
            tmin: mn.value, tmin_ts: mn.ts, tmax: mx.value, tmax_ts: mx.ts,
            updated_at: now,
          }),
        });
      }
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "dnevni", last_success_at: now, last_fetched_at: now, last_error: null, last_count: 1 }),
    });
    return Response.json({ status: "ok" });
  } catch (e: any) {
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
