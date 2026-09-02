import type { NormalizedObservation } from '../sources/zhms-aws/normalize';
function parseMeasuredAt(raw: string): Date | null {
  const m = raw.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm)-1, Number(dd), Number(hh), Number(min)));
}
export function getReferenceTime(observations: NormalizedObservation[]): Date | null {
  let max: Date | null = null;
  for (const o of observations) {
    const d = parseMeasuredAt(o.measuredAtRaw);
    if (!d) continue;
    if (!max || d > max) max = d;
  }
  return max;
}
export function filterEligible(observations: NormalizedObservation[], ref: Date, hours: number = 1): NormalizedObservation[] {
  const ms = hours * 60 * 60 * 1000;
  return observations.filter(o => {
    const d = parseMeasuredAt(o.measuredAtRaw);
    if (!d || !ref) return false;
    const diff = ref.getTime() - d.getTime();
    return diff >= 0 && diff <= ms;
  });
}
export interface Extremes {
  referenceTime: string | null;
  eligibleCount: number;
  hottest: NormalizedObservation[];
  coldest: NormalizedObservation[];
  strongestWind: NormalizedObservation[];
  weakestWind: NormalizedObservation[];
  mostPrecipitation: NormalizedObservation[];
  leastPrecipitation: NormalizedObservation[];
}
export function calcExtremes(observations: NormalizedObservation[]): Extremes {
  const ref = getReferenceTime(observations);
  const eligible = ref ? filterEligible(observations, ref, 1) : [];
  const refIso = ref ? ref.toISOString() : null;
  function extremesFor(getVal: (o: NormalizedObservation) => number | undefined, findMax: boolean): NormalizedObservation[] {
    const cand = eligible.filter(o => getVal(o) != null) as NormalizedObservation[];
    if (cand.length === 0) return [];
    const vals = cand.map(o => getVal(o) as number);
    const ext = findMax ? Math.max(...vals) : Math.min(...vals);
    return cand.filter(o => getVal(o) === ext);
  }
  return {
    referenceTime: refIso,
    eligibleCount: eligible.length,
    hottest: extremesFor(o => o.temperatureC, true),
    coldest: extremesFor(o => o.temperatureC, false),
    strongestWind: extremesFor(o => o.windSpeedMs, true),
    weakestWind: extremesFor(o => o.windSpeedMs, false),
    mostPrecipitation: extremesFor(o => o.precipitationMm, true),
    leastPrecipitation: extremesFor(o => o.precipitationMm, false),
  };
}
