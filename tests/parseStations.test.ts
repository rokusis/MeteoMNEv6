import { describe, it, expect } from 'vitest';
import { parseStations, isActiveStation } from '../src/sources/zhms-aws/parseStations';

const SAMPLE = `
<html><script>
var stanice = [
  ["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1],
  ["02TEST99","",43.1,19.2,100,"Test Selo","padavinska",0]
];
var posljednje = [];
</script></html>
`;

describe('parseStations', () => {
  it('cita Podgoricu iz var stanice', () => {
    const list = parseStations(SAMPLE);
    expect(list).toHaveLength(2);
    const pg = list[0];
    expect(pg.stationId).toBe('02PDGR10');
    expect(pg.wmoId).toBe('13463');
    expect(pg.latitude).toBeCloseTo(42.43648);
    expect(pg.longitude).toBeCloseTo(19.27199);
    expect(pg.elevation).toBe(49);
    expect(pg.name).toBe('Podgorica');
    expect(isActiveStation(pg)).toBe(true);
  });
  it('prepoznaje neaktivnu', () => {
    const list = parseStations(SAMPLE);
    expect(isActiveStation(list[1])).toBe(false);
  });
  it('baca gresku ako nema var stanice', () => {
    expect(() => parseStations('no data')).toThrow();
  });
});
