import { describe, it, expect } from 'vitest';
import { normalizeObservations } from '../src/sources/zhms-aws/normalize';
import type { Station } from '../src/sources/zhms-aws/parseStations';
import type { RawObservation } from '../src/sources/zhms-aws/parseObservations';

const stations: Station[] = [
  { stationId: '02PDGR10', wmoId: '13463', name: 'Podgorica', latitude: 42.43648, longitude: 19.27199, elevation: 49, stationType: 'glavna', statusFlag: 1 },
  { stationId: '02TEST00', wmoId: '00000', name: 'Test', latitude: 43, longitude: 19, elevation: 100, stationType: 'glavna', statusFlag: 0 },
];

const obs: RawObservation[] = [
  { stationId: '02PDGR10', measuredAtRaw: '31.08.2026 19:40', temperatureC: 21.5, precipitationMm: 0, windSpeedMs: 2.3, windDirectionCode: 16, gustMs: 5.1 },
  { stationId: '02TEST00', measuredAtRaw: '31.08.2026 19:40', temperatureC: 10, windDirectionCode: 0 },
  { stationId: '02XXXX', measuredAtRaw: '31.08.2026 19:40', temperatureC: 99 },
];

describe('normalize', () => {
  it('spaja stanicu i mjerenje i racuna vjetar', () => {
    const n = normalizeObservations(stations, obs);
    expect(n).toHaveLength(2);
    expect(n[0].stationName).toBe('Podgorica');
    expect(n[0].windDirectionDeg).toBe(180);
    expect(n[0].windCompass).toBe('S');
    expect(n[0].isActiveStation).toBe(true);
    expect(n[1].isActiveStation).toBe(false);
  });
  it('preskace nepoznatu stanicu', () => {
    const n = normalizeObservations(stations, obs);
    expect(n.find(x => x.stationId === '02XXXX')).toBeUndefined();
  });
});
