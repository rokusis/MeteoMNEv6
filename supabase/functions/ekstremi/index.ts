// ekstremi: sadasnji min/max u Supabase. Zove je prednja strana po potrebi.
// Isto racunanje kao backend (referentno vreme + 1 sat + izjednaceni).
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function parseMeasuredAt(raw: string): Date | null {
  const m = String(raw ?? "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5])));
}

async function sb(path: string): Promise<any> {
  const res = await fetch(SB_URL.replace(/\/$/, "") + path, {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
  });
  if (!res.ok) throw new Error("sb " + res.status);
  return res.json();
}

Deno.serve(async () => {
  try {
    const [obs, st] = await Promise.all([
      sb("/rest/v1/observations?select=*"),
      sb("/rest/v1/stations?select=station_id,name,is_active"),
    ]);
    const active = new Map<string, boolean>((Array.isArray(st) ? st : []).map((s: any) => [s.station_id, !!s.is_active]));
    const names = new Map<string, string>((Array.isArray(st) ? st : []).map((s: any) => [s.station_id, s.name]));
    const list = (Array.isArray(obs) ? obs : []).map((o: any) => ({
      stationId: o.station_id,
      stationName: names.get(o.station_id) ?? o.station_id,
      measuredAtRaw: o.measured_at_raw,
      temperatureC: o.temperature_c ?? undefined,
      precipitationMm: o.precipitation_mm ?? undefined,
      windSpeedMs: o.wind_speed_ms ?? undefined,
      isActiveStation: active.get(o.station_id) ?? true,
    }));
    let ref: Date | null = null;
    let refRaw: string | null = null;
    for (const o of list) {
      const d = parseMeasuredAt(o.measuredAtRaw);
      if (!d) continue;
      if (!ref || d > ref) { ref = d; refRaw = o.measuredAtRaw; }
    }
    const elig = ref
      ? list.filter((o: any) => {
          if (!o.isActiveStation) return false;
          const d = parseMeasuredAt(o.measuredAtRaw);
          if (!d) return false;
          const diff = ref!.getTime() - d.getTime();
          return diff >= 0 && diff <= 3600000;
        })
      : [];
    const pick = (get: (o: any) => number | undefined, max: boolean) => {
      const cand = elig.filter((o: any) => get(o) != null);
      if (!cand.length) return [];
      const vals = cand.map((o: any) => get(o) as number);
      const ext = max ? Math.max(...vals) : Math.min(...vals);
      return cand.filter((o: any) => get(o) === ext);
    };
    return Response.json({
      status: elig.length ? "ok" : "unavailable",
      referenceTime: ref ? ref.toISOString() : null,
      referenceTimeRaw: refRaw,
      eligibleCount: elig.length,
      hottest: pick((o: any) => o.temperatureC, true),
      coldest: pick((o: any) => o.temperatureC, false),
      strongestWind: pick((o: any) => o.windSpeedMs, true),
      weakestWind: pick((o: any) => o.windSpeedMs, false),
      mostPrecipitation: pick((o: any) => o.precipitationMm, true),
      leastPrecipitation: pick((o: any) => o.precipitationMm, false),
    });
  } catch (e: any) {
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
