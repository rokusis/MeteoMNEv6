// zvanicna: zvanicna prognoza u Supabase. Poziva je pg_cron svakih 5 minuta.
// Koraci: uzmi stranu -> parsiraj -> upisi kes na promenu -> zabelezi.
// Greska se upise, nikad ne baca.
const URL = "https://www.meteo.co.me/page.php?id=31";
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function extractTab(html: string, tabId: string): any | null {
  const start = html.indexOf(`id="${tabId}"`);
  if (start === -1) return null;
  const slice = html.slice(start, start + 5000);
  const t1 = slice.match(/<div class="prognoza-title">\s*([^<]+?)\s*<\/div>/i);
  const t2 = slice.match(/<div class="prognoza-text">\s*([\s\S]*?)\s*<\/div>/i);
  const t3 = slice.match(/<div class="prognoza-sign"[^>]*>\s*([^<]+?)\s*<\/div>/i);
  if (!t1 || !t2) return null;
  const title = stripHtml(t1[1]);
  const text = stripHtml(t2[1]);
  const issuedAt = t3 ? stripHtml(t3[1]) : undefined;
  let image: string | undefined;
  const imgM = slice.match(/<img[^>]+src="([^"]+cgprognoza[^"]*\.svg[^"]*)"/i) || slice.match(/<img[^>]+src="([^"]+\.svg[^"]*)"/i);
  if (imgM) image = imgM[1];
  if (image && image.startsWith("/")) image = "https://www.meteo.co.me" + image;
  if (!text || text.length < 5) return null;
  return { title, text: text.slice(0, 1500), issuedAt, image };
}
function fp(o: any): string {
  const days = (o?.days ?? []).map((d: any) => `${d.title ?? ""}|${d.issuedAt ?? ""}`).join(";");
  return days;
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
    const html = await res.text();
    const days: any[] = [];
    const a = extractTab(html, "tab_a");
    const b = extractTab(html, "tab_b");
    if (a) days.push(a);
    if (b) days.push(b);
    if (!days.length) throw new Error("official empty");
    const o = { days };
    const f = fp(o);
    const prev = await sb("/rest/v1/official_log?select=fingerprint&order=checked_at.desc&limit=1");
    const prevFp = Array.isArray(prev) && prev.length ? prev[0].fingerprint : null;
    const status = prevFp == null ? "first" : prevFp === f ? "same" : "changed";
    if (status !== "same") {
      const titles = days.map((d: any) => d.title).join(" | ").slice(0, 300);
      await sb("/rest/v1/official_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ checked_at: now, status, fingerprint: f, titles }),
      });
      await sb("/rest/v1/official_cache?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, fetched_at: now, payload: o }),
      });
    }
    await sb("/rest/v1/source_status?on_conflict=source", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ source: "official", last_success_at: now, last_fetched_at: now, last_error: null, last_count: days.length }),
    });
    return Response.json({ status: "ok", logged: status, days: days.length });
  } catch (e: any) {
    try {
      await sb("/rest/v1/source_status?on_conflict=source", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ source: "official", last_success_at: null, last_fetched_at: now, last_error: String(e?.message ?? e).slice(0, 200), last_count: 0 }),
      });
    } catch {}
    return Response.json({ status: "error", message: String(e?.message ?? e).slice(0, 200) });
  }
});
