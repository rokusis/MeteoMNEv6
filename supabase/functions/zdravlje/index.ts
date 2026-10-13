// zdravlje: jedan pogled na sve izvore u Supabase. Samo cita, nista ne pise.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sb(path: string): Promise<any> {
  const res = await fetch(SB_URL.replace(/\/$/, "") + path, {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
  });
  if (!res.ok) throw new Error("sb " + res.status);
  return res.json();
}
function ageMin(iso: any, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((nowMs - t) / 60000));
}
function stateOf(age: number | null, limit: number): string {
  if (age == null || !Number.isFinite(age)) return "unknown";
  return age <= limit ? "ok" : "stale";
}

Deno.serve(async () => {
  const nowMs = Date.now();
  try {
    const [st, airLog] = await Promise.all([
      sb("/rest/v1/source_status?select=source,last_success_at,last_error,last_count"),
      sb("/rest/v1/air_log?select=checked_at,status&order=checked_at.desc&limit=1"),
    ]);
    const bySource = new Map<string, any>((Array.isArray(st) ? st : []).map((s: any) => [s.source, s]));
    const out: any[] = [];
    const push = (source: string, limit: number, detail: string) => {
      const r = bySource.get(source);
      const age = ageMin(r?.last_success_at, nowMs);
      out.push({
        source, state: r?.last_error ? "stale" : stateOf(age, limit),
        checkedAgeMin: age, detail,
        error: r?.last_error ?? null, count: r?.last_count ?? null,
      });
    };
    push("aws", 10, "T/kisa/vetar svaka 3 min");
    push("graph", 10, "vlaga/pritisak/sunce na dogadjaj");
    push("synop", 840, "termini 07/14/21");
    push("official", 30, "zvanicna na 5 min");
    push("hydro", 30, "reke na 3 min");
    push("sea-snow", 30, "more na 3 min");
    push("numerical", 1500, "ture gotove kad pise done");
    push("air", 60, "vazduh na 3 min");
    const airAge = Array.isArray(airLog) && airLog.length
      ? ageMin(airLog[0].checked_at, nowMs)
      : null;
    const air = out.find((s) => s.source === "air");
    if (air) {
      air.checkedAgeMin = airAge;
      if (airAge != null && airAge > 60) air.state = "stale";
    }
    const bad = out.filter((s) => s.state !== "ok").length;
    return Response.json({ status: bad ? "degraded" : "ok", sources: out, at: new Date(nowMs).toISOString() });
  } catch (e: any) {
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
