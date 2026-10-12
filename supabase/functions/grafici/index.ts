// grafici: H/P/GR u Supabase. Poziva je pg_cron svaka 3 minuta.
// Okidac je pomeren snimak iz tabele observations (ne fiksni prozori).
// Po krugu max 5 stanica, sveze prvo. Pise samo nove tacke (kap 500).
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

const LIMIT = 5;
const BUDGET_MS = 20000;
const MAX_POINTS = 500;
const LAG_LIMIT = 8;

const FAST_IDS = new Set([
  "02BAR010", "02CTNJ10", "02HNOV10", "02KOLS10", "02NIKS10",
  "02PDGR10", "02PLJV10", "02ULCN10", "02ZBLJ10",
]);
function maxBurst(id: string): number { return FAST_IDS.has(id) ? 5 : id === "02LKOT20" ? 4 : 4; }
function retrySpacingMin(miss: number, id: string): number {
  return miss < maxBurst(id) ? 2 : 6;
}
function maxChecks(id: string): number { return maxBurst(id) + 6; }

function lastSunday(year: number, monthIdx: number): number {
  const d = new Date(Date.UTC(year, monthIdx + 1, 0));
  return d.getUTCDate() - d.getUTCDay();
}
function pgOffset(yyyy: number, mm: number, dd: number, hh: number, mi: number): number {
  const asUtc = Date.UTC(yyyy, mm - 1, dd, hh, mi);
  const dstStart = Date.UTC(yyyy, 2, lastSunday(yyyy, 2), 1, 0);
  const dstEnd = Date.UTC(yyyy, 9, lastSunday(yyyy, 9), 1, 0);
  return asUtc >= dstStart && asUtc < dstEnd ? 2 : 1;
}
function parseSnapshotMs(raw: any): number | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) {
    const t = Date.parse(String(raw));
    return Number.isFinite(t) ? t : null;
  }
  return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5])) - pgOffset(Number(m[3]), Number(m[2]), Number(m[1]), Number(m[4]), Number(m[5])) * 3600000;
}
function isDue(s: any, nowMs: number): boolean {
  if (s.last_snapshot_ms == null) return true;
  if (s.done_ms != null && s.last_snapshot_ms <= s.done_ms) return false;
  if (nowMs - s.last_snapshot_ms < 90000) return false;
  if (s.miss >= maxChecks(s.station_id)) return false;
  if (s.last_check_ms == null) return true;
  return nowMs - s.last_check_ms >= retrySpacingMin(s.miss, s.station_id) * 60000;
}
function cleanJson(s: string): string {
  let r = s.replace(/([{,]\s*)([A-Z0-9_]+)\s*:/g, '$1"$2":');
  return r.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
}
function parseDataAll(rawHtml: string): any {
  const m = rawHtml.match(/var\s+DataAll\s*=\s*(\{[\s\S]*?\});/);
  if (!m) throw new Error("var DataAll not found");
  const obj = JSON.parse(cleanJson(m[1]));
  const flat: Record<string, any[]> = {};
  if (obj.G1) Object.assign(flat, obj.G1);
  if (obj.G2) Object.assign(flat, obj.G2);
  if (obj.G3) Object.assign(flat, obj.G3);
  if (!obj.G1 && !obj.G2 && !obj.G3) Object.assign(flat, obj);
  const out: any = {};
  for (const [k, arr] of Object.entries(flat)) {
    if (!Array.isArray(arr)) continue;
    out[k] = (arr as any[]).map(([ts, val]: any[]) => ({
      ts: Number(ts), value: val === "" || val == null ? null : Number(val),
    })).filter((p: any) => Number.isFinite(p.ts));
  }
  return out;
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
async function sball(rows: any[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40);
    await Promise.all(chunk.map((r: any) =>
      sb("/rest/v1/station_timeseries", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(r),
      })
    ));
  }
}

Deno.serve(async () => {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const t0 = Date.now();
  try {
    const snaps: any[] = await sb("/rest/v1/observations?select=station_id,measured_at_raw");
    const states: any[] = await sb("/rest/v1/graph_state?select=*");
    const byId = new Map<string, any>((states ?? []).map((s: any) => [s.station_id, s]));
    const cands = (snaps ?? []).map((s: any) => {
      const saved = byId.get(s.station_id);
      const snapMs = parseSnapshotMs(s.measured_at_raw);
      if (saved) {
        if (snapMs != null && saved.last_snapshot_ms != null && snapMs !== saved.last_snapshot_ms) {
          return { ...saved, last_snapshot_ms: snapMs, miss: 0 };
        }
        return saved;
      }
      return { station_id: s.station_id, last_snapshot_ms: snapMs, last_check_ms: null, last_change_ms: null, miss: 0, done_ms: null };
    });
    const due = cands.filter((c: any) => isDue(c, nowMs));
    const isFresh = (c: any) => {
      const saved = byId.get(c.station_id);
      if (!saved || saved.last_check_ms == null) return true;
      const snapMs = parseSnapshotMs((snaps ?? []).find((s: any) => s.station_id === c.station_id)?.measured_at_raw ?? null);
      return snapMs != null && saved.last_snapshot_ms != null && snapMs !== saved.last_snapshot_ms;
    };
    due.sort((a: any, b: any) => Number(isFresh(b)) - Number(isFresh(a)) || ((b.last_snapshot_ms == null ? 9e15 : nowMs - b.last_snapshot_ms) - (a.last_snapshot_ms == null ? 9e15 : nowMs - a.last_snapshot_ms)));
    let updated = 0;
    for (const d of due.slice(0, LIMIT)) {
      if (Date.now() - t0 > BUDGET_MS) break;
      try {
        const [g1, g3] = await Promise.all([
          fetch(`https://www.meteo.co.me/Meteorologija/aws-graph.php?v=G1&s=${encodeURIComponent(d.station_id)}`, { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any).then((r) => r.text()),
          fetch(`https://www.meteo.co.me/Meteorologija/aws-graph.php?v=G3&s=${encodeURIComponent(d.station_id)}`, { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any).then((r) => r.text()),
        ]);
        if (!g1.includes("var DataAll") || !g3.includes("var DataAll")) throw new Error("no DataAll");
        const p1 = parseDataAll(g1);
        const p3 = parseDataAll(g3);
        const want: [string, any[]][] = [["H", p1.H ?? []], ["P", p3.P ?? []], ["GR", p3.GR ?? []]];
        const mx = await sb(`/rest/v1/station_timeseries?select=ts&station_id=eq.${encodeURIComponent(d.station_id)}&param=in.(H,P,GR)&order=ts.desc&limit=1`);
        const prevMax = Array.isArray(mx) && mx.length ? mx[0].ts : null;
        const onlyNew = (pts: any[]) => {
          const cut = pts.length > MAX_POINTS ? pts.slice(-MAX_POINTS) : pts;
          return prevMax == null ? cut : cut.filter((p: any) => p.ts > prevMax);
        };
        for (const [param, pts] of want) {
          const nn = onlyNew(pts).filter((p: any) => p.value != null);
          if (nn.length) await sball(nn.map((p: any) => ({ station_id: d.station_id, ts: p.ts, param, value: p.value })));
        }
        const snapMs = parseSnapshotMs((snaps ?? []).find((s: any) => s.station_id === d.station_id)?.measured_at_raw ?? null);
        const latestNew = Math.max(0, ...(want.flatMap(([, pts]) => pts.map((p: any) => p.ts))));
        const changed = snapMs != null && latestNew >= snapMs - 5 * 60000;
        const nx = (changed || (snapMs != null && d.last_snapshot_ms != null && snapMs !== d.last_snapshot_ms))
          ? { station_id: d.station_id, last_snapshot_ms: snapMs ?? d.last_snapshot_ms, last_check_ms: nowMs, last_change_ms: changed ? nowMs : d.last_change_ms, miss: 0, done_ms: changed ? (snapMs ?? d.last_snapshot_ms) : d.done_ms, updated_at: now }
          : { station_id: d.station_id, last_snapshot_ms: snapMs ?? d.last_snapshot_ms, last_check_ms: nowMs, last_change_ms: d.last_change_ms, miss: (d.miss ?? 0) + 1, done_ms: d.done_ms, updated_at: now };
        await sb("/rest/v1/graph_state?on_conflict=station_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(nx),
        });
        if (changed) {
          updated++;
          const lag = snapMs == null ? null : Math.round(((nowMs - snapMs) / 60000) * 10) / 10;
          if (lag != null && lag > LAG_LIMIT) {
            const snap = (snaps ?? []).find((s: any) => s.station_id === d.station_id);
            await sb("/rest/v1/graph_lag_log", {
              method: "POST",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ checked_at: now, station_id: d.station_id, lag_min: lag, snapshot_raw: snap?.measured_at_raw ?? null }),
            });
          }
        }
      } catch {
        const snapMs = parseSnapshotMs((snaps ?? []).find((s: any) => s.station_id === d.station_id)?.measured_at_raw ?? null);
        await sb("/rest/v1/graph_state?on_conflict=station_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ station_id: d.station_id, last_snapshot_ms: snapMs ?? d.last_snapshot_ms, last_check_ms: nowMs, last_change_ms: d.last_change_ms, miss: (d.miss ?? 0) + 1, done_ms: d.done_ms, updated_at: now }),
        });
      }
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "graph", last_success_at: now, last_fetched_at: now, last_error: null, last_count: updated }),
    });
    return Response.json({ status: "ok", updated });
  } catch (e: any) {
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
