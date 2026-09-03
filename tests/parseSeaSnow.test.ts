import { describe, it, expect } from 'vitest';
import { parseSeaSnow } from '../src/sources/zhms-sea-snow/parseSeaSnow';
const SAMPLE_SEA = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead><tr><th></th><th>Grad</th><th>Temperatura mora</th></tr></thead><tr><th scope=\\"row\\">1</th><td>Herceg Novi  </td><td>28 °C</td></tr><tr><th scope=\\"row\\">2</th><td>Bar  </td><td>28 °C</td></tr><tr><th scope=\\"row\\">3</th><td>Ulcinj  </td><td>27 °C</td></tr>";`;
const SAMPLE_SNOW_EMPTY = `var snowH2="Srijeda, 02.09.2026. 8h "; var snowT2="<thead><tr><th>Grad</th><th>Snijeg</th></tr></thead>"; var seaH=""; var seaT="";`;
describe('sea snow html', () => {
  it('cita more iz HTML tabele', () => {
    const {sea} = parseSeaSnow(SAMPLE_SEA);
    expect(sea.length).toBe(3);
    expect(sea[0].place).toBe('Herceg Novi');
    expect(sea[0].tempC).toBe(28);
    expect(sea[0].timeRaw).toContain('14h');
  });
  it('prazan snijeg ljeti', () => {
    const {snow} = parseSeaSnow(SAMPLE_SNOW_EMPTY);
    expect(snow.length).toBe(0);
  });
});
