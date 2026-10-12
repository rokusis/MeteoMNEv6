// glavno: AWS bulk u Supabase. Poziva je pg_cron svaka 3 minuta.
// Koraci: uzmi stranu -> proveri -> parsiraj -> upisi samo promenjene stanice.
// Greska se upise, nikad ne baca.
// TLS: izvor ima noviji lanac (ISRG X2) kog Deno nema, zato veza sa lancem.
const URL = "https://www.meteo.co.me/Meteorologija/aws_m.php";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CA_BUNDLE = `-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICjDCCAhGgAwIBAgIQTfOxXdbAeExQfNN7WObxFTAKBggqhkjOPQQDAzAuMQswCQYDVQQGEwJV
UzENMAsGA1UEChMESVNSRzEQMA4GA1UEAxMHUm9vdCBZRTAeFw0yNTA5MDMwMDAwMDBaFw0yODA5
MDIyMzU5NTlaMDMxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQD
EwNZRTIwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAARxmrQzkdbEEL3MqXt3dJQttYc47axkdDTHud5T
PqM2z5uSD5cmk0WrHlWXvnlvqBLqiB34kluxIbmMyAiq3/YD6e80/vV259K8XQIdjFXloYOa0mIU
71f7HQ09PvYDlw+jge4wgeswDgYDVR0PAQH/BAQDAgGGMBMGA1UdJQQMMAoGCCsGAQUFBwMBMBIG
A1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFLlZ8o7PIvCG0zdI/3YUGLqC2FWHMB8GA1UdIwQY
MBaAFKPIJlqOoUzQNWP8myPIOq5W809WMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcwAoYWaHR0
cDovL3llLmkubGVuY3Iub3JnLzATBgNVHSAEDDAKMAgGBmeBDAECATAnBgNVHR8EIDAeMBygGqAY
hhZodHRwOi8veWUuYy5sZW5jci5vcmcvMAoGCCqGSM49BAMDA2kAMGYCMQDIcnw5dcZLN9ffynXn
nkLD/itSJEycJPb3sRkzeqBowup7vOsAwaqoCnNn/jh9wycCMQCJM6CPlaOC4pQYYbJtVPYbDKrI
b2EKk5NpOpE6/XttQYZV/3gilB9l+Cc/DOVwmyg=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICpjCCAiugAwIBAgIRAIchZfw0tuX7qK3Vs3BftTowCgYIKoZIzj0EAwMwTzELMAkGA1UEBhMC
VVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2VhcmNoIEdyb3VwMRUwEwYDVQQDEwxJ
U1JHIFJvb3QgWDIwHhcNMjYwNTEzMDAwMDAwWhcNMzIwOTAyMjM1OTU5WjAuMQswCQYDVQQGEwJV
UzENMAsGA1UEChMESVNSRzEQMA4GA1UEAxMHUm9vdCBZRTB2MBAGByqGSM49AgEGBSuBBAAiA2IA
BDwS/6vhrcVqcbBo+wgdI3fwn9x7DNJJOY/lTOti0vkwuRN87RhEhTH17E7XyFjWsPYhIPt/wzOq
xTd2b+4ZJNy9ID04YywF9U5zasDVyGSNErVNtz8uSGh5izW87j77GaOB6zCB6DAOBgNVHQ8BAf8E
BAMCAQYwEwYDVR0lBAwwCgYIKwYBBQUHAwEwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUo8gm
Wo6hTNA1Y/ybI8g6rlbzT1YwHwYDVR0jBBgwFoAUfEKWrt5LSDv6kviejM9ti6lyN5UwMgYIKwYB
BQUHAQEEJjAkMCIGCCsGAQUFBzAChhZodHRwOi8veDIuaS5sZW5jci5vcmcvMBMGA1UdIAQMMAow
CAYGZ4EMAQIBMCcGA1UdHwQgMB4wHKAaoBiGFmh0dHA6Ly94Mi5jLmxlbmNyLm9yZy8wCgYIKoZI
zj0EAwMDaQAwZgIxAMU19WCtmxVND8UHBZRoma49Z7jPs64Dma0eTu1OChVbB/2J7GV3nvYKAx54
uk1G9QIxAO0miLVJu8PLNiXXXkiE/gsK3CTRTF/aeo4bMX42Zw40csRU6AC26hSW1/IWaas6dg==
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQswCQYDVQQGEwJV
UzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElT
UkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVT
MSkwJwYDVQQKEyBJbnRlcm5ldCBTZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNS
RyBSb290IFgyMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0H
ttwW+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9ItgKbppb
d9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0TAQH/BAUwAwEB/zAdBgNV
HQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZIzj0EAwMDaAAwZQIwe3lORlCEwkSHRhtF
cP9Ymd70/aTSVaYgLXTWNLxBo1BfASdWtL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5
U6VR5CmD1/iQMVtCnwr1/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----`;

let tlsClient: any = null;
function tls(): any {
  if (!tlsClient) tlsClient = (Deno as any).createHttpClient({ caCerts: [CA_BUNDLE] });
  return tlsClient;
}

function cleanJson(s: string): string {
  return s.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
}
function toNum(v: any): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}
function toInt(v: any): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}
function windCodeToDegrees(code: number | undefined): number | undefined {
  if (code == null || !Number.isFinite(code)) return undefined;
  if (code < 0 || code > 32) return undefined;
  return Math.round(code * 11.25 * 10) / 10;
}
function windCodeToCompass(code: number | undefined): string | undefined {
  if (code == null || code < 0 || code > 32) return undefined;
  const deg = windCodeToDegrees(code)!;
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
function stationFp(o: any): string {
  return [o.measuredAtRaw, o.temperatureC, o.precipitationMm, o.windSpeedMs, o.windDirectionCode, o.gustMs].join("|");
}

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

Deno.serve(async () => {
  const now = new Date().toISOString();
  try {
    const res = await fetch(URL, { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any);
    const text = await res.text();
    if (!text.includes("var stanice") || !text.includes("var posljednje")) throw new Error("AWS invalid kind");
    const sm = text.match(/var\s+stanice\s*=\s*(\[[\s\S]*?\]);/);
    const pm = text.match(/var\s+posljednje\s*=\s*(\{[\s\S]*?\});/);
    if (!sm || !pm) throw new Error("AWS vars missing");
    const stArr = JSON.parse(cleanJson(sm[1])) as any[];
    const posObj = JSON.parse(cleanJson(pm[1])) as Record<string, any[]>;
    const stMap = new Map<string, any>();
    for (const r of stArr) {
      const id = String(r[0] ?? "").trim();
      if (!id) continue;
      stMap.set(id, {
        stationId: id, wmoId: r[1] ? String(r[1]) : null, name: String(r[5] ?? "").trim(),
        latitude: Number(r[2]), longitude: Number(r[3]),
        elevation: r[4] != null && r[4] !== "" && r[4] !== "-" ? Number(r[4]) : null,
        stationType: r[6] ? String(r[6]) : null,
        isActive: r[7] === 1 || r[7] === "1" || r[7] === true,
      });
    }
    const obs: any[] = [];
    for (const group of Object.values(posObj)) {
      for (const r of group as any[]) {
        const id = String(r[0] ?? "").trim();
        const st = stMap.get(id);
        if (!id || !st) continue;
        const mat = String(r[3] ?? "").trim();
        if (!mat) continue;
        const wdc = toInt(r[7]);
        obs.push({
          stationId: id, measuredAtRaw: mat,
          temperatureC: toNum(r[4]), precipitationMm: toNum(r[5]),
          windSpeedMs: toNum(r[6]), windDirectionCode: wdc,
          windDirectionDeg: windCodeToDegrees(wdc), windCompass: windCodeToCompass(wdc),
          gustMs: toNum(r[8]),
        });
      }
    }
    if (!obs.length) throw new Error("no normalized");
    const prev = await sb("/rest/v1/bulk_state?select=source,fingerprint");
    const prevMap = new Map<string, string>((Array.isArray(prev) ? prev : []).map((x: any) => [String(x.source).slice(4), x.fingerprint]));
    const changed = obs.filter((o: any) => prevMap.get(o.stationId) !== stationFp(o));
    if (changed.length) {
      for (const o of changed) {
        const st = stMap.get(o.stationId)!;
        await sb("/rest/v1/stations?on_conflict=station_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            station_id: st.stationId, wmo_id: st.wmoId, name: st.name,
            latitude: st.latitude, longitude: st.longitude, elevation: st.elevation,
            station_type: st.stationType, is_active: st.isActive, updated_at: now,
          }),
        });
        await sb("/rest/v1/observations?on_conflict=station_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            station_id: o.stationId, measured_at_raw: o.measuredAtRaw,
            temperature_c: o.temperatureC ?? null, precipitation_mm: o.precipitationMm ?? null,
            wind_speed_ms: o.windSpeedMs ?? null, wind_direction_code: o.windDirectionCode ?? null,
            wind_direction_deg: o.windDirectionDeg ?? null, wind_compass: o.windCompass ?? null,
            gust_ms: o.gustMs ?? null, fetched_at: now,
          }),
        });
        await sb("/rest/v1/bulk_state?on_conflict=source", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ source: "aws:" + o.stationId, fingerprint: stationFp(o), updated_at: now }),
        });
      }
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "aws", last_success_at: now, last_fetched_at: now, last_error: null, last_count: obs.length }),
    });
    return Response.json({ status: "ok", stations: obs.length, changed: changed.length });
  } catch (e: any) {
    try {
      await sb("/rest/v1/source_status?on_conflict=source", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ source: "aws", last_success_at: null, last_fetched_at: now, last_error: String(e?.message ?? e).slice(0, 200), last_count: 0 }),
      });
    } catch {}
    return Response.json({ status: "error", message: String(e?.message ?? e) });
  }
});
