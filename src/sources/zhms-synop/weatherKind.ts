export type SynopKind = { symbolIndex: number | null; text: string | null; status: 'OK' | 'UNRESOLVED' };

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const NEBO = ["Vedro","Pretežno vedro","Malo oblačno","Umjereno oblačno","Pretežno oblačno","Oblačno"];

export function weatherSymbolIndex(ww: unknown, obl: unknown, vbnobl: unknown): number | null {
  const clouds = toNum(obl);
  if (obl === '-') return 0;
  if (clouds == null) return null;
  const code = toNum(ww);
  const vb = toNum(vbnobl);
  const correction = vb === 9 ? -1 : 0;
  if (code == null || code < 4) {
    if (clouds < 3) return 1;
    if (clouds < 5) return 2;
    if (clouds < 7) return 3;
    return 4;
  }
  return null;
}

export function weatherText(ww: unknown, obl: unknown, vbnobl: unknown): string | null {
  const clouds = toNum(obl);
  if (clouds == null) return null;
  const code = toNum(ww);
  const vb = toNum(vbnobl);
  if (code == null || code < 4) {
    if (clouds < 2) return NEBO[0];
    if (clouds < 3) return vb === 9 ? NEBO[0] : NEBO[1];
    if (clouds < 5) return vb === 9 ? NEBO[1] : NEBO[2];
    if (clouds < 7) return vb === 9 ? NEBO[2] : NEBO[3];
    if (clouds < 8) return vb === 9 ? NEBO[3] : NEBO[4];
    return vb === 9 ? NEBO[4] : NEBO[5];
  }
  return null;
}

export function synopKind(ww: unknown, obl: unknown, vbnobl: unknown): SynopKind {
  const symbolIndex = weatherSymbolIndex(ww, obl, vbnobl);
  const text = weatherText(ww, obl, vbnobl);
  if (symbolIndex == null || text == null) return { symbolIndex, text, status: 'UNRESOLVED' };
  return { symbolIndex, text, status: 'OK' };
}
