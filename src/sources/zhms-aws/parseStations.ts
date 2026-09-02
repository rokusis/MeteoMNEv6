export interface Station {
  stationId: string;
  wmoId?: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  stationType?: string;
  statusFlag?: number | string | boolean;
}

const STANICE_RE = /var\s+stanice\s*=\s*(\[[\s\S]*?\]);/;

export function parseStations(rawHtml: string): Station[] {
  const m = rawHtml.match(STANICE_RE);
  if (!m) throw new Error('var stanice not found');
  const arr = JSON.parse(m[1]) as any[];
  return arr.map((r: any[]) => ({
    stationId: String(r[0] ?? '').trim(),
    wmoId: r[1] ? String(r[1]) : undefined,
    latitude: Number(r[2]),
    longitude: Number(r[3]),
    elevation: r[4] != null && r[4] !== '' ? Number(r[4]) : undefined,
    name: String(r[5] ?? '').trim(),
    stationType: r[6] ? String(r[6]) : undefined,
    statusFlag: r[7],
  })).filter(s => s.stationId);
}

export function isActiveStation(s: Station): boolean {
  return (s.statusFlag as any) === 1 || s.statusFlag === '1' || (s.statusFlag as any) === true;
}
