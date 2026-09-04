import { describe, it, expect } from 'vitest';
import { parseSynop } from '../src/sources/zhms-synop/parseSynop';
const FIX = `var sinopCGHour=12; var sinopCGDay="2026/09/04"; var sinop=[{ sifra: '13463', naziv: 'Podgorica', sat: '12', obl: '2', VBNobl: '6', Ws: 3 },{ sifra: '13459', naziv: 'Niksic', sat: '12', obl: '2', VBNobl: '6' }];`;
describe('synop raw', () => {
  it('cita 2 stanice + sat za ikonice kasnije', () => {
    const r = parseSynop(FIX);
    expect(r.meta.hour).toBe('12');
    expect(r.stations.length).toBe(2);
    expect(r.stations[0].sifra).toBe('13463');
    expect(r.stations[0].obl).toBe('2');
  });
  it('odbija no data', () => {
    expect(() => parseSynop('var sinop=[]; no data')).toThrow();
  });
  it('odbija bez var sinop', () => {
    expect(() => parseSynop('<html>hello</html>')).toThrow();
  });
});
