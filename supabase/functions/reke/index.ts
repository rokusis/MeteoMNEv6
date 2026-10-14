// reke: hidrologija u Supabase. Poziva je pg_cron svaka 3 minuta.
// Koraci: uzmi stranu -> parsiraj -> upisi kes na promenu -> zabelezi.
// Greska se upise, nikad ne baca.
const URL = "https://www.meteo.co.me/Hidrologija/aws_h.php";
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
  return s.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}").replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
}
function hydroFp(stations: any[], obs: any[]): string {
  return obs.map((o: any) => `${o.stationId}|${o.measuredAtRaw}|${o.waterLevelCm}|${o.waterTempC}`).sort().join(";");
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

// Cuvar oblika: drugaciji oblik se broji, treci isti za redom postaje novo
// normalno. Jedno djubre nikad ne prodje. Vraca true ako sme da pise.
async function checkSchema(source: string, fp: string): Promise<boolean> {
  const now = new Date().toISOString();
  let row: any = null;
  try {
    const r = await sb(`/rest/v1/schema_state?select=fingerprint,pending_fp,pending_hits&source=eq.${source}`);
    row = Array.isArray(r) && r.length ? r[0] : null;
  } catch {}
  if (!row || row.fingerprint == null) {
    try {
      if (!row) await sb("/rest/v1/schema_state", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ source, fingerprint: fp, pending_fp: null, pending_hits: 0, updated_at: now }) });
      else await sb(`/rest/v1/schema_state?source=eq.${source}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fingerprint: fp, pending_fp: null, pending_hits: 0, updated_at: now }) });
    } catch {}
    return true;
  }
  if (row.fingerprint === fp) {
    if (row.pending_fp != null) {
      try { await sb(`/rest/v1/schema_state?source=eq.${source}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ pending_fp: null, pending_hits: 0, updated_at: now }) }); } catch {}
    }
    return true;
  }
  const hits = row.pending_fp === fp ? (row.pending_hits ?? 0) + 1 : 1;
  if (hits >= 3) {
    try { await sb(`/rest/v1/schema_state?source=eq.${source}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fingerprint: fp, pending_fp: null, pending_hits: 0, updated_at: now }) }); } catch {}
    return true;
  }
  try { await sb(`/rest/v1/schema_state?source=eq.${source}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ pending_fp: fp, pending_hits: hits, updated_at: now }) }); } catch {}
  return false;
}

Deno.serve(async () => {
  const now = new Date().toISOString();
  try {
    const res = await fetch(URL, { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any);
    const html = await res.text();
    const sm = html.match(/var\s+staniceH\s*=\s*(\{[\s\S]*?\});/);
    const pm = html.match(/var\s+posljednje\s*=\s*(\{[\s\S]*?\});/);
    if (!sm || !pm) throw new Error("hydro vars missing");
    const stObj = JSON.parse(cleanJson(sm[1])) as Record<string, any[]>;
    const stations: any[] = [];
    for (const group of Object.values(stObj)) {
      for (const r of (Array.isArray(group) ? group : []) as any[]) {
        stations.push({
          id: String(r[0]).trim(), wmoId: String(r[1] ?? "").trim() || null,
          lat: r[2] === "" ? null : Number(r[2]), lon: r[3] === "" ? null : Number(r[3]),
          elevation: r[4] === "" ? null : Number(r[4]), name: String(r[5] ?? "").trim(),
          stationType: String(r[6] ?? "").trim() || null, river: String(r[7] ?? "").trim() || null,
          flag: r[8] ?? null,
        });
      }
    }
    const obObj = JSON.parse(cleanJson(pm[1])) as Record<string, Record<string, any[]>>;
    const stGroups = Object.values(stObj);
    const obGroups = Object.values(obObj);
    const stFirst = stGroups.length && Array.isArray(stGroups[0]) ? (stGroups[0] as any[]) : [];
    const obFirst = obGroups.length ? (Object.values((obGroups[0] ?? {}) as Record<string, any[]>).find((r) => Array.isArray(r)) as any[] ?? []) : [];
    const schFp = `staniceH:${stGroups.length}x${stFirst.length ? stFirst[0].length : 0}|posljednje:${obGroups.length}x${obFirst.length ? obFirst.length : 0}`;
    if (!(await checkSchema("hydro", schFp))) throw new Error("hydro schema change, sacuvano prethodno");
    const obs: any[] = [];
    for (const group of Object.values(obObj)) {
      for (const [sid, r] of Object.entries(group as Record<string, any[]>)) {
        if (!Array.isArray(r)) continue;
        obs.push({
          stationId: String(sid).trim(), name: String(r[1] ?? "").trim(),
          measuredAtRaw: String(r[2] ?? "").trim(),
          waterLevelCm: r[3] === "" ? null : Number(r[3]),
          waterTempC: r[4] === "" ? null : Number(r[4]),
        });
      }
    }
    if (!obs.length) throw new Error("hydro empty");
    const fp = hydroFp(stations, obs);
    const prev = await sb("/rest/v1/hydro_log?select=fingerprint&order=checked_at.desc&limit=1");
    const prevFp = Array.isArray(prev) && prev.length ? prev[0].fingerprint : null;
    const status = prevFp == null ? "first" : prevFp === fp ? "same" : "changed";
    if (status !== "same") {
      await sb("/rest/v1/hydro_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ checked_at: now, status, fingerprint: fp.slice(0, 4000), station_count: obs.length }),
      });
      await sb("/rest/v1/hydro_cache?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, fetched_at: now, payload: { stations, observations: obs } }),
      });
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "hydro", last_success_at: now, last_fetched_at: now, last_error: null, last_count: obs.length }),
    });
    return Response.json({ status: "ok", logged: status, stations: obs.length });
  } catch (e: any) {
    try {
      await sb("/rest/v1/source_status?on_conflict=source", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ source: "hydro", last_success_at: null, last_fetched_at: now, last_error: String(e?.message ?? e).slice(0, 200), last_count: 0 }),
      });
    } catch {}
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
