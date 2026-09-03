export interface NumericalHour { utcHour: string; symbol?: string; rrMm?: number; rhPct?: number; windCode?: string; }
export interface NumericalDay { date?: string; tmin?: number; tmax?: number; hours: NumericalHour[]; model: string; city: string; }
function toNum(s: string): number | undefined {
  const n = Number(s.replace(',', '.').replace('−','-').replace('−','-').trim().replace(/\.$/,''));
  return Number.isFinite(n) ? n : undefined;
}
function strip(s: string): string { return s.replace(/<[^>]+>/g,'').trim(); }
export function parseNumerical(html: string, city: string, model: string): NumericalDay {
  const tminM = html.match(/Tmin[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const tmaxM = html.match(/Tmax[\s\S]*?<td[^>]*>\s*([^<]+?)\s*<\/td>/i);
  const tmin = tminM ? toNum(strip(tminM[1])) : undefined;
  const tmax = tmaxM ? toNum(strip(tmaxM[1])) : undefined;
  const dateM = html.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\.\d{2}\.\d{4})/);
  // nadji datum iz naslova "Četvrtak, 2026-09-03"
  const dateTitle = html.match(/<td[^>]*class="style3"[^>]*>\s*([^<]+,\s*2026-\d{2}-\d{2})\s*<\/td>/i);
  const date = dateTitle ? strip(dateTitle[1]) : (dateM ? dateM[0] : undefined);
  const hours: NumericalHour[] = [];
  // nadji sve redove sa satima
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
  // fallback: ako nema 8, probaj bez simbola
  if (hours.length === 0) {
    const altRe = /<td[^>]*>\s*(00|03|06|09|12|15|18|21)\s*<\/td>/gi;
    let mm: RegExpExecArray | null;
    const times: string[] = [];
    while ((mm = altRe.exec(html)) !== null) times.push(mm[1]);
    for (const t of times) hours.push({ utcHour: t });
  }
  return { date, tmin, tmax, hours, model, city };
}
