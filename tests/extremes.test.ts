import { describe, it, expect } from 'vitest';
import { calcExtremes } from '../src/lib/extremes';
import type { NormalizedObservation } from '../src/sources/zhms-aws/normalize';
function obs(id: string, temp: number | undefined, wind: number | undefined, prec: number | undefined, time: string): NormalizedObservation {
  return { stationId: id, stationName: id, measuredAtRaw: time, temperatureC: temp, windSpeedMs: wind, precipitationMm: prec, isActiveStation: true } as any;
}
describe('extremes 1h', () => {
  it('najtoplije i najhladnije u 1h, starije se iskljucuje', () => {
    const refTime = "02.09.2026 20:50";
    const oldTime = "02.09.2026 19:00";
    const data = [obs('A', 30, 2, 0, refTime), obs('B', 10, 5, 0, "02.09.2026 20:00"), obs('C', 35, 1, 0, oldTime)];
    const e = calcExtremes(data);
    expect(e.eligibleCount).toBe(2);
    expect(e.hottest[0].stationId).toBe('A');
    expect(e.coldest[0].stationId).toBe('B');
  });
  it('tacno 1h je ukljuceno (granica)', () => {
    const data = [obs('A', 20, 1, 0, "02.09.2026 20:50"), obs('B', 25, 1, 0, "02.09.2026 19:50")];
    const e = calcExtremes(data);
    expect(e.eligibleCount).toBe(2);
    expect(e.hottest[0].stationId).toBe('B');
  });
  it('vraca measuredAtRaw za diskretan prikaz', () => {
    const data = [obs('A', 30, 1, 0, "02.09.2026 20:50")];
    const e = calcExtremes(data);
    expect(e.hottest[0].measuredAtRaw).toBe("02.09.2026 20:50");
  });
  it('nema kandidata kad nema podataka', () => {
    const e = calcExtremes([]);
    expect(e.hottest).toEqual([]);
    expect(e.referenceTime).toBeNull();
  });
  it('tie - vise stanica isto najtoplije', () => {
    const t = "02.09.2026 20:50";
    const data = [obs('A', 30, 1, 0, t), obs('B', 30, 1, 0, t), obs('C', 20, 1, 0, t)];
    const e = calcExtremes(data);
    expect(e.hottest).toHaveLength(2);
  });
});
