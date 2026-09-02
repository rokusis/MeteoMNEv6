import { describe, it, expect } from 'vitest';
import { parseObservations } from '../src/sources/zhms-aws/parseObservations';

const SAMPLE = `
var posljednje = {
  "glavna": [["02PDGR10","glavna","Podgorica","31.08.2026 19:40","21.5","0.0","2.3","16","5.1"]],
  "padavinska": [["02TEST01","padavinska","Test","31.08.2026 19:40","","","","",""]]
};
var stanice = [];
`;

describe('parseObservations', () => {
  it('cita Podgoricu', () => {
    const obs = parseObservations(SAMPLE);
    expect(obs).toHaveLength(2);
    const pg = obs[0];
    expect(pg.stationId).toBe('02PDGR10');
    expect(pg.measuredAtRaw).toBe('31.08.2026 19:40');
    expect(pg.temperatureC).toBe(21.5);
    expect(pg.precipitationMm).toBe(0);
    expect(pg.windSpeedMs).toBe(2.3);
    expect(pg.windDirectionCode).toBe(16);
    expect(pg.gustMs).toBe(5.1);
  });
  it('prazno je undefined a ne 0', () => {
    const obs = parseObservations(SAMPLE);
    const t = obs[1];
    expect(t.temperatureC).toBeUndefined();
    expect(t.windSpeedMs).toBeUndefined();
  });
  it('baca gresku ako nema var posljednje', () => {
    expect(() => parseObservations('no data')).toThrow();
  });
});
