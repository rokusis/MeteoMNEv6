// air-tick: EPA vazduh u Supabase. Poziva je pg_cron svaka 3 minuta.
// Koraci: uzmi stranu -> parsiraj -> upisi kes (samo pun/veci skup) ->
// zabelezi u log samo na promenu. Greska se upise, nikad ne baca.
const URL = "https://www.epa.org.me/vazduh/";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cleanCell(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&micro;/g, "µ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPointsBlock(src: string): string {
  const start = src.indexOf("var points");
  if (start === -1) throw new Error("missing var points");
  const openIdx = src.indexOf("[", start);
  if (openIdx === -1) throw new Error("missing points array");
  let depth = 0;
  let inStr = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  throw new Error("unclosed points array");
}

function splitEntries(arraySrc: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let inStr = false;
  let inEntry = false;
  for (let i = 0; i < arraySrc.length; i++) {
    const c = arraySrc[i];
    if (inStr) {
      if (inEntry) cur += c;
      if (c === "\\") {
        if (inEntry && i + 1 < arraySrc.length) { cur += arraySrc[i + 1]; i++; }
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; if (inEntry) cur += c; continue; }
    if (!inEntry) {
      if (c === "[") {
        if (depth === 0) { depth = 1; continue; }
        inEntry = true; depth = 2; cur = "[";
      }
      continue;
    }
    if (c === "[") depth++;
    if (c === "]") depth--;
    cur += c;
    if (depth === 1 && inEntry) {
      out.push(cur);
      cur = "";
      inEntry = false;
    }
  }
  return out.filter((s) => s.includes('"'));
}

function splitFields(entrySrc: string): string[] {
  const inner = entrySrc.trim().replace(/^\[/, "").replace(/\]$/, "");
  const out: string[] = [];
  let cur = "";
  let inStr = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\" && i + 1 < inner.length) { cur += c + inner[i + 1]; i++; continue; }
      if (c === '"') { inStr = false; cur += c; continue; }
      cur += c;
      continue;
    }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === ",") { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return t;
}

function parseTooltip(tip: string): { dateRaw: string; values: { pollutant: string; valueRaw: string }[] } {
  const dateM = tip.match(/<p class=['"]date['"]>([^<]+)<\/p>/);
  const dateRaw = dateM ? dateM[1].trim() : "";
  const values: { pollutant: string; valueRaw: string }[] = [];
  const re = /<div class\s*='rTableCell1[^']*'[^>]*>([\s\S]*?)<\/div>\s*<div class\s*='rTableCell2[^']*'[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tip)) !== null) {
    const pollutant = cleanCell(m[1]);
    const valueRaw = cleanCell(m[2]);
    if (!pollutant) continue;
    values.push({ pollutant, valueRaw });
  }
  return { dateRaw, values };
}

function parseAir(src: string): any[] {
  if (!src || !src.includes("var points")) throw new Error("missing var points");
  const block = extractPointsBlock(src);
  const entries = splitEntries(block);
  if (entries.length === 0) throw new Error("empty air");
  const out: any[] = [];
  for (const e of entries) {
    const f = splitFields(e);
    if (f.length < 6) continue;
    const name = unquote(f[0]);
    const latRaw = unquote(f[1]);
    const lonRaw = unquote(f[2]);
    const url = unquote(f[3]);
    const pin = unquote(f[4]);
    const tip = unquote(f[5]);
    const idM = url.match(/\/stanica\/(\d+)/);
    if (!name || !idM) continue;
    const { dateRaw, values } = parseTooltip(tip);
    if (!dateRaw) continue;
    const lat = latRaw === "" ? NaN : Number(latRaw);
    const lon = lonRaw === "" ? NaN : Number(lonRaw);
    out.push({
      id: idM[1], name,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      pin, dateRaw, values,
    });
  }
  if (out.length === 0) throw new Error("empty air");
  return out;
}

function fingerprint(stations: any[]): string {
  return (stations ?? [])
    .map((s: any) => {
      const vals = Array.isArray(s.values)
        ? s.values.map((v: any) => `${v.pollutant ?? ""}=${v.valueRaw ?? ""}`).join(",")
        : "";
      return `${s.id ?? ""}|${s.dateRaw ?? ""}|${vals}`;
    })
    .sort()
    .join(";");
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
    const res = await fetch(URL, { headers: { "User-Agent": "MeteoMNEv6/1.0" } });
    if (!res.ok) throw new Error("air http " + res.status);
    const stations = parseAir(await res.text());
    const fp = fingerprint(stations);
    const prev = await sb("/rest/v1/air_log?select=fingerprint&order=checked_at.desc&limit=1");
    const prevFp = Array.isArray(prev) && prev.length ? prev[0].fingerprint : null;
    const status = prevFp == null ? "first" : prevFp === fp ? "same" : "changed";
    if (status !== "same") {
      await sb("/rest/v1/air_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ checked_at: now, status, fingerprint: fp.slice(0, 4000), station_count: stations.length }),
      });
      await sb("/rest/v1/air_cache?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: 1, fetched_at: now, payload: { stations } }),
      });
    }
    return Response.json({ status: "ok", logged: status, stations: stations.length });
  } catch (e: any) {
    try {
      await sb("/rest/v1/air_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ checked_at: now, status: "error:" + String(e?.message ?? e).slice(0, 120), fingerprint: null, station_count: null }),
      });
    } catch {}
    return Response.json({ status: "error", message: String(e?.message ?? e) });
  }
});
