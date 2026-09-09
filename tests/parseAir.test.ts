import { describe, it, expect } from 'vitest';
import { parseAir } from '../src/sources/epa-air/parseAir';

const TIP_PG =
  `<h2>Podgorica UT</h2><p class='date'>09.09.2026 01:00</p><div class='rTable'>` +
  `<div class='rTableRow'><div class ='rTableCell1 svzelena' >NO<sub>2</sub></div><div class ='rTableCell2 svzelena' >60,7 &micro;g/m<sup>3</sup></div></div>` +
  `<div class='rTableRow'><div class ='rTableCell1 zelena' >CO</div><div class ='rTableCell2 zelena' >0,52 mg/m<sup>3</sup></div></div>` +
  `<div class='rTableRow'><div class ='rTableCell1 zelena' >C<sub>6</sub>H<sub>6</sub></div><div class ='rTableCell2 zelena' >&lt; 0,1 &micro;g/m<sup>3</sup></div></div></div>`;

const TIP_BAR =
  `<h2>Bar</h2><p class='date'>09.09.2026 01:00</p><div class='rTable'>` +
  `<div class='rTableRow'><div class ='rTableCell1 svzelena' >PM10</div><div class ='rTableCell2 svzelena' >43,5 &micro;g/m<sup>3</sup></div></div></div>`;

const PAGE =
  `<html><body><script>var points = [` +
  `["Podgorica UT", 42.420126,19.255149,"https://www.epa.org.me/vazduh/stanica/1","pin-lgreen","${TIP_PG}"],` +
  `["Bar", 42.103842,19.09441,"https://www.epa.org.me/vazduh/stanica/3","pin-lgreen","${TIP_BAR}"]` +
  `];</script></body></html>`;

describe('parseAir', () => {
  it('vadi stanice, id, datum i vrednosti', () => {
    const s = parseAir(PAGE);
    expect(s.length).toBe(2);
    const pg = s.find((x) => x.id === '1')!;
    expect(pg.name).toBe('Podgorica UT');
    expect(pg.dateRaw).toBe('09.09.2026 01:00');
    expect(pg.lat).toBeCloseTo(42.42, 2);
    expect(pg.values.length).toBe(3);
    expect(pg.values[0].pollutant).toBe('NO2');
    expect(pg.values[0].valueRaw).toContain('60,7');
    expect(pg.values[2].valueRaw).toContain('< 0,1');
    const bar = s.find((x) => x.id === '3')!;
    expect(bar.values[0].pollutant).toBe('PM10');
  });
  it('baca kad nema var points', () => {
    expect(() => parseAir('<html>nista</html>')).toThrow('missing var points');
  });
  it('baca kad je niz prazan', () => {
    expect(() => parseAir('<script>var points = [];</script>')).toThrow('empty air');
  });
});
