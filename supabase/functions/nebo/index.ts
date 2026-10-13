// nebo: sinopticki termini u Supabase. Poziva je pg_cron svakih 10 minuta.
// Gusto samo oko termina 07/14/21 lokalno, inace preskoci. Upise samo nov termin.
// Greska se upise, nikad ne baca.
const URL = "https://www.meteo.co.me/synopT.php";
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

const NEBO = ["Vedro","Pretežno vedro","Malo oblačno","Umjereno oblačno","Pretežno oblačno","Oblačno"];
function toNum(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function kindText(ww: unknown, obl: unknown, vb: unknown): string | null {
  const clouds = toNum(obl);
  const code = toNum(ww);
  const v = toNum(vb);
  if (clouds != null && (code == null || code < 4)) {
    if (clouds < 2) return NEBO[0];
    if (clouds < 3) return v === 9 ? NEBO[0] : NEBO[1];
    if (clouds < 5) return v === 9 ? NEBO[1] : NEBO[2];
    if (clouds < 7) return v === 9 ? NEBO[2] : NEBO[3];
    if (clouds < 8) return v === 9 ? NEBO[3] : NEBO[4];
    return v === 9 ? NEBO[4] : NEBO[5];
  }
  return null;
}
function kindIndex(ww: unknown, obl: unknown, vb: unknown): number | null {
  const clouds = toNum(obl);
  if (obl === "-") return 0;
  if (clouds == null) return null;
  const code = toNum(ww);
  const v = toNum(vb);
  const c = v === 9 ? -1 : 0;
  void c;
  if (code == null || code < 4) {
    if (clouds < 3) return 1;
    if (clouds < 5) return 2;
    if (clouds < 7) return 3;
    return 4;
  }
  return null;
}
function extractVarBlock(src: string, marker: string): string {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error("missing " + marker);
  const openIdx = src.indexOf("[", start);
  if (openIdx === -1) throw new Error("missing sinop array");
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === "[") depth++;
    if (src[i] === "]") {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  throw new Error("unclosed sinop array");
}
function getField(objSrc: string, name: string): string | undefined {
  const m = objSrc.match(new RegExp("\\b" + name + "\\s*:\\s*('[^']*'|\"[^\"]*\"|[^,}]+)"));
  return m ? m[1].trim() : undefined;
}
function unq(v: string): string {
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) return v.slice(1, -1);
  return v;
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
    // Gusto samo oko termina (lokalno +2): 06:30-08:30, 13:30-15:30, 20:30-22:30.
    const lh = (new Date().getUTCHours() + 2) % 24;
    const lm = new Date().getUTCMinutes();
    const m = lh * 60 + lm;
    const open = (m >= 390 && m < 510) || (m >= 810 && m < 930) || (m >= 1230 && m < 1350);
    if (!open) return Response.json({ status: "ok", skipped: true });
    const res = await fetch(URL, { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any);
    const text = await res.text();
    if (!text.includes("var sinop")) throw new Error("SYNOP invalid");
    if (text.includes("no data")) throw new Error("empty sinop");
    const hourM = text.match(/var\s+sinopCGHour\s*=\s*(\d+)/);
    const dayM = text.match(/var\s+sinopCGDay\s*=\s*"([^"]+)"/);
    const block = extractVarBlock(text, "var sinop");
    const objs: string[] = [];
    {
      let depth = 0, cur = "", inStr: string | null = null, inObj = false;
      for (let i = 0; i < block.length; i++) {
        const c = block[i];
        if (inStr) {
          if (inObj) cur += c;
          if (c === inStr) inStr = null;
          continue;
        }
        if (c === "'" || c === '"') { inStr = c; if (inObj) cur += c; continue; }
        if (!inObj) {
          if (c === "{") { inObj = true; depth = 1; cur = "{"; }
          continue;
        }
        if (c === "{") depth++;
        if (c === "}") depth--;
        cur += c;
        if (depth === 0 && inObj) { objs.push(cur); cur = ""; inObj = false; }
      }
    }
    const stations: any[] = [];
    for (const o of objs.filter((s) => s.includes("sifra"))) {
      const sifra = getField(o, "sifra");
      const naziv = getField(o, "naziv");
      const sat = getField(o, "sat");
      if (!sifra || !naziv || !sat) continue;
      const ww = getField(o, "ww");
      const obl = getField(o, "obl");
      const vb = getField(o, "VBNobl");
      const t = kindText(ww === undefined ? undefined : unq(ww), obl === undefined ? undefined : unq(obl), vb === undefined ? undefined : unq(vb));
      const si = kindIndex(ww === undefined ? undefined : unq(ww), obl === undefined ? undefined : unq(obl), vb === undefined ? undefined : unq(vb));
      stations.push({
        sifra: unq(sifra), naziv: unq(naziv), sat: unq(sat),
        synopText: t, synopSymbolIndex: si, synopStatus: t ? "OK" : "UNRESOLVED",
      });
    }
    if (!stations.length) throw new Error("SYNOP empty");
    const meta = { hour: hourM?.[1] ?? null, day: dayM?.[1] ?? null };
    const prev = await sb("/rest/v1/synop_cache?select=meta_hour,meta_day&id=eq.1");
    const p = Array.isArray(prev) && prev.length ? prev[0] : null;
    if (!p || p.meta_hour !== meta.hour || p.meta_day !== meta.day) {
      await sb("/rest/v1/synop_cache?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, meta_hour: meta.hour, meta_day: meta.day, fetched_at: now, payload: stations }),
      });
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "synop", last_success_at: now, last_fetched_at: now, last_error: null, last_count: stations.length }),
    });
    return Response.json({ status: "ok", stations: stations.length, term: `${meta.day ?? ""} ${meta.hour ?? ""}`.trim() });
  } catch (e: any) {
    try {
      await sb("/rest/v1/source_status?on_conflict=source", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ source: "synop", last_success_at: null, last_fetched_at: now, last_error: String(e?.message ?? e).slice(0, 200), last_count: 0 }),
      });
    } catch {}
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
