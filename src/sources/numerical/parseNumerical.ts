export interface NumericalHour { utcHour: string; symbol?: string; rrMm?: number; rhPct?: number; windCode?: string; }
export interface NumericalDay { date?: string; tmin?: number; tmax?: number; hours: NumericalHour[]; model: string; city: string; }
function toNum(s: string): number | undefined {
  const n = Number(s.replace(',', '.').replace('−','-').replace('−','-').trim().replace(/\.$/,''));
  if (!Number.isFinite(n)) return undefined;
  return n === 0 ? 0 : n;
}
function strip(s: string): string { return s.replace(/<[^>]+>/g,'').trim(); }
export function parseNumerical(html: string, city: string, model: string): NumericalDay {
  const tminM = html.match(/Tmin[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const tmaxM = html.match(/Tmax[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const tmin = tminM ? toNum(strip(tminM[1])) : undefined;
  const tmax = tmaxM ? toNum(strip(tmaxM[1])) : undefined;
  const dateM = html.match(/<td[^>]*class="style3"[^>]*>\s*([^<]+,\s*2026-\d{2}-\d{2})\s*<\/td>/i);
  const date = dateM ? strip(dateM[1]) : undefined;
  const hours: NumericalHour[] = [];
  const rowRe = /<tr>\s*<td[^>]*>\s*(00|03|06|09|12|15|18|21)\s*<\/td>\s*<td[^>]*>\s*<img[^>]+src="[^"]*Simbolcici\/([^"]+)\.svg"[^>]*>\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>\s*<td[^>]*>\s*<img[^>]+src="[^"]*\/V\/([^"]+)\.svg"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const utcHour = m[1];
    const symbol = m[2];
    const rr = toNum(m[3]);
    const rh = toNum(m[4]);
    const windCode = m[5];
    hours.push({ utcHour, symbol, rrMm: rr, rhPct: rh, windCode });
  }
  return { date, tmin, tmax, hours, model, city };
}
