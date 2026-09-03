export interface SeaPoint { place: string; tempC?: number; timeRaw?: string; }
export interface SnowPoint { place: string; heightCm?: number; timeRaw?: string; }

function extractSeaT(html: string): string {
  const m = html.match(/var\s+seaT\s*=\s*"([\s\S]*?)";/);
  return m ? m[1] : "";
}
function extractSeaH(html: string): string {
  const m = html.match(/var\s+seaH\s*=\s*"([\s\S]*?)";/);
  return m ? m[1].trim() : "";
}
function extractSnowT2(html: string): string {
  const m = html.match(/var\s+snowT2\s*=\s*"([\s\S]*?)";/);
  return m ? m[1] : "";
}
function extractSnowH2(html: string): string {
  const m = html.match(/var\s+snowH2\s*=\s*"([\s\S]*?)";/);
  return m ? m[1].trim() : "";
}

function parseSeaTable(htmlSnippet: string, timeRaw: string): SeaPoint[] {
  const out: SeaPoint[] = [];
  const re = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(htmlSnippet)) !== null) {
    const place = m[1].trim();
    const tempStr = m[2].replace('°C','').replace('°','').trim();
    if (!place || place.toLowerCase() === 'grad') continue;
    const temp = tempStr === '' ? undefined : Number(tempStr);
    out.push({ place, tempC: Number.isFinite(temp as number) ? temp as number : undefined, timeRaw });
  }
  return out;
}

function parseSnowTable(htmlSnippet: string, timeRaw: string): SnowPoint[] {
  const out: SnowPoint[] = [];
  const re = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(htmlSnippet)) !== null) {
    const place = m[1].trim();
    const hStr = m[2].replace('cm','').trim();
    if (!place || place.toLowerCase() === 'grad') continue;
    const h = hStr === '' ? undefined : Number(hStr);
    out.push({ place, heightCm: Number.isFinite(h as number) ? h as number : undefined, timeRaw });
  }
  return out;
}

export function parseSea(html: string): SeaPoint[] {
  const t = extractSeaT(html);
  const h = extractSeaH(html);
  if (!t) return [];
  return parseSeaTable(t, h);
}
export function parseSnow(html: string): SnowPoint[] {
  const t = extractSnowT2(html);
  const h = extractSnowH2(html);
  if (!t || !t.includes('<td>')) return [];
  return parseSnowTable(t, h);
}
export function parseSeaSnow(html: string): { sea: SeaPoint[]; snow: SnowPoint[] } {
  return { sea: parseSea(html), snow: parseSnow(html) };
}
