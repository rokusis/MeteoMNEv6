import { parseSynop } from './parseSynop';

const NEBO = ["Vedro","Pretežno vedro","Malo oblačno","Umjereno oblačno","Pretežno oblačno","Oblačno"];

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function extractJsArray(src: string, varName: string): string[] | null {
  const i = src.indexOf('var ' + varName);
  if (i === -1) return null;
  const a = src.indexOf('[', i);
  if (a === -1) return null;
  let depth = 0;
  let cur = '';
  const out: string[] = [];
  let inStr: string | null = null;
  for (let k = a; k < src.length; k++) {
    const c = src[k];
    if (inStr) {
      cur += c;
      if (c === inStr) { out.push(cur); cur = ''; inStr = null; }
      continue;
    }
    if (c === "'" || c === '"') { inStr = c; cur = c; continue; }
    if (c === ']') break;
  }
  return out.map(s => s.slice(1, -1));
}

export function fullWeatherText(src: string, ww: unknown, obl: unknown, vbnobl: unknown): string | null {
  const clouds = toNum(obl);
  const code = toNum(ww);
  const vb = toNum(vbnobl);
  if (clouds != null && (code == null || code < 4)) {
    if (clouds < 2) return NEBO[0];
    if (clouds < 3) return vb === 9 ? NEBO[0] : NEBO[1];
    if (clouds < 5) return vb === 9 ? NEBO[1] : NEBO[2];
    if (clouds < 7) return vb === 9 ? NEBO[2] : NEBO[3];
    if (clouds < 8) return vb === 9 ? NEBO[3] : NEBO[4];
    return vb === 9 ? NEBO[4] : NEBO[5];
  }
  if (code != null) {
    const arr = extractJsArray(src, 'opisiPojava');
    if (arr && arr[Math.round(code)] != null) return arr[Math.round(code)];
  }
  return null;
}
