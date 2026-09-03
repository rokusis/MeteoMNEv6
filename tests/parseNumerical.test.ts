import { describe, it, expect } from 'vitest';
import { parseNumerical } from '../src/sources/numerical/parseNumerical';
const SAMPLE = `
<td><span class="styleTn">Tmin</span></td><td>21.6</td>
<td><span class="styleTx">Tmax</span></td><td>33.7</td>
<td class="style3">Četvrtak, 2026-09-03</td>
<tr><td>00</td><td><img src="./Simbolcici/N/01.svg"></td><td>0.0</td><td>60.</td><td><img src="./Simbolcici/V/v1-045.svg"></td></tr>
<tr><td>03</td><td><img src="./Simbolcici/N/01.svg"></td><td>-0.0</td><td>48.</td><td><img src="./Simbolcici/V/v1-360.svg"></td></tr>
<tr><td>06</td><td><img src="./Simbolcici/D/01.svg"></td><td>0.0</td><td>31.</td><td><img src="./Simbolcici/V/v0-000.svg"></td></tr>
`;
describe('parseNumerical',()=>{
  it('cita Tmin/Tmax i 3 sata',()=>{
    const d=parseNumerical(SAMPLE, 'POD', 'model2');
    expect(d.tmin).toBe(21.6);
    expect(d.tmax).toBe(33.7);
    expect(d.date).toContain('2026-09-03');
    expect(d.hours.length).toBe(3);
    expect(d.hours[0].utcHour).toBe('00');
    expect(d.hours[0].symbol).toBe('N/01');
    expect(d.hours[0].rrMm).toBe(0);
    expect(d.hours[0].rhPct).toBe(60);
    expect(d.hours[0].windCode).toBe('v1-045');
    expect(d.hours[1].rrMm).toBe(0); // -0.0 -> 0
    expect(d.hours[2].windCode).toBe('v0-000');
  });
});
