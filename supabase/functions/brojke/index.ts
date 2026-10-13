// brojke: racunarska prognoza u Supabase. Poziva je pg_cron svaka 3 minuta.
// Straza: jeftina uslovna provera izdanja; ture: 2 grada po krugu sa kursorom.
// Greska se upise, nikad ne baca.
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

const CITIES = ["POD","TUZ","ULC","BAR","BUD","KOT","TIV","HER","CET","DAN","NIK","SAV","KOL","PLU","PLA","AND","GUS","MOJ","BER","ROZ","BIJ","ZAB","PLJ","ADB","PET"];
const MODELS = ["e3km", "a3km"];
const BATCH = 2;

function numUrl(model: string, city: string, day: number): string {
  const folder = model === "a3km" ? "5danaA" : "5danaE";
  const letter = model === "a3km" ? "A" : "E";
  return `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/${city}-${letter}${day}.html`;
}
function toNum(s: string): number | undefined {
  const n = Number(s.replace(",", ".").replace(/−/g, "-").trim().replace(/\.$/, ""));
  if (!Number.isFinite(n)) return undefined;
  return n === 0 ? 0 : n;
}
function strip(s: string): string { return s.replace(/<[^>]+>/g, "").trim(); }
function parseNum(html: string): any {
  const tminM = html.match(/Tmin[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const tmaxM = html.match(/Tmax[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const dateM = html.match(/<td[^>]*class="style3"[^>]*>\s*([^<]+,\s*2026-\d{2}-\d{2})\s*<\/td>/i);
  const hours: any[] = [];
  const rowRe = /<tr>\s*<td[^>]*>\s*(00|03|06|09|12|15|18|21)\s*<\/td>\s*<td[^>]*>\s*<img[^>]+src="[^"]*Simbolcici\/([^"]+)\.svg"[^>]*>\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>\s*<td[^>]*>\s*<img[^>]+src="[^"]*\/V\/([^"]+)\.svg"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    hours.push({ utcHour: m[1], symbol: m[2], rrMm: toNum(m[3]), rhPct: toNum(m[4]), windCode: m[5] });
  }
  return {
    date: dateM ? strip(dateM[1]) : undefined,
    tmin: tminM ? toNum(strip(tminM[1])) : undefined,
    tmax: tmaxM ? toNum(strip(tmaxM[1])) : undefined,
    hours,
  };
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
async function slog(city: string, model: string, lm: string | null, etag: string | null, status: string): Promise<void> {
  await sb("/rest/v1/numerical_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ checked_at: new Date().toISOString(), city, model, last_modified: lm, etag, status }),
  });
}

Deno.serve(async () => {
  const now = new Date().toISOString();
  const done: string[] = [];
  try {
    for (const model of MODELS) {
      const letter = model === "a3km" ? "A" : "E";
      const folder = model === "a3km" ? "5danaA" : "5danaE";
      const sentinel = `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/POD-${letter}1.html`;
      const ref = await sb(`/rest/v1/numerical_refresh?select=last_modified,cursor_idx,status&model=eq.${model}`);
      const known = Array.isArray(ref) && ref.length ? ref[0] : null;
      const headers: Record<string, string> = { "User-Agent": "MeteoMNEv6/1.0" };
      if (known?.last_modified) headers["If-Modified-Since"] = known.last_modified;
      let sres: Response;
      try {
        sres = await fetch(sentinel, { headers, client: tls() } as any);
      } catch (e: any) {
        await slog("POD", model, null, null, "error:" + String(e?.message ?? e).slice(0, 120));
        continue;
      }
      const lm = sres.headers.get("last-modified") || sres.headers.get("Last-Modified") || known?.last_modified || null;
      const etag = sres.headers.get("etag") || sres.headers.get("ETag") || null;
      if (sres.status === 304) continue;
      if (!(sres.status === 200 && lm && lm !== known?.last_modified)) continue;
      await slog("POD", model, lm, etag, "200");
      await sb("/rest/v1/numerical_refresh?on_conflict=model", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ model, last_modified: lm, cursor_idx: 0, status: "pending", updated_at: now }),
      });
      const cur = await sb(`/rest/v1/numerical_refresh?select=cursor_idx&model=eq.${model}`);
      let idx = Array.isArray(cur) && cur.length ? (cur[0].cursor_idx ?? 0) : 0;
      let n = 0;
      while (idx < CITIES.length && n < BATCH) {
        const city = CITIES[idx];
        idx++;
        try {
          for (let day = 1; day <= 5; day++) {
            const r = await fetch(numUrl(model, city, day), { headers: { "User-Agent": "MeteoMNEv6/1.0" }, client: tls() } as any);
            const p = parseNum(await r.text());
            const dr = await sb("/rest/v1/numerical_days?on_conflict=city,model,day_num", {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates,return=representation" },
              body: JSON.stringify({ city, model, day_num: day, date: p.date || null, tmin: p.tmin ?? null, tmax: p.tmax ?? null, fetched_at: now }),
            });
            const dayId = Array.isArray(dr) && dr.length ? dr[0].id : null;
            if (dayId != null) {
              await sb(`/rest/v1/numerical_hours?day_id=eq.${dayId}`, { method: "DELETE" });
              for (const h of p.hours) {
                await sb("/rest/v1/numerical_hours", {
                  method: "POST",
                  headers: { Prefer: "return=minimal" },
                  body: JSON.stringify({ day_id: dayId, utc_hour: h.utcHour, symbol: h.symbol || null, rr_mm: h.rrMm ?? null, rh_pct: h.rhPct ?? null, wind_code: h.windCode || null }),
                });
              }
            }
          }
          done.push(model + ":" + city);
          n++;
        } catch { continue; }
      }
      const finished = idx >= CITIES.length;
      await sb("/rest/v1/numerical_refresh?on_conflict=model", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ model, last_modified: lm, cursor_idx: finished ? CITIES.length : idx, status: finished ? "done" : "pending", updated_at: now }),
      });
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "numerical", last_success_at: now, last_fetched_at: now, last_error: null, last_count: done.length }),
    });
    return Response.json({ status: "ok", cities: done });
  } catch (e: any) {
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
