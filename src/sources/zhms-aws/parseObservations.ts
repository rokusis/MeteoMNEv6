export interface RawObservation {
  stationId: string;
  stationType?: string;
  name?: string;
  measuredAtRaw: string;
  temperatureC?: number;
  precipitationMm?: number;
  windSpeedMs?: number;
  windDirectionCode?: number;
  gustMs?: number;
}

const POSLJEDNJE_RE = /var\s+posljednje\s*=\s*(\{[\s\S]*?\});/;

function toNum(v: any): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}
function toInt(v: any): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function parseObservations(rawHtml: string): RawObservation[] {
  const m = rawHtml.match(POSLJEDNJE_RE);
  if (!m) throw new Error('var posljednje not found');
  const obj = JSON.parse(m[1]) as Record<string, any[]>;
  const out: RawObservation[] = [];
  for (const group of Object.values(obj)) {
    for (const r of group as any[]) {
      out.push({
        stationId: String(r[0] ?? '').trim(),
        stationType: r[1] ? String(r[1]) : undefined,
        name: r[2] ? String(r[2]) : undefined,
        measuredAtRaw: String(r[3] ?? '').trim(),
        temperatureC: toNum(r[4]),
        precipitationMm: toNum(r[5]),
        windSpeedMs: toNum(r[6]),
        windDirectionCode: toInt(r[7]),
        gustMs: toNum(r[8]),
      });
    }
  }
  return out.filter(o => o.stationId && o.measuredAtRaw);
}
