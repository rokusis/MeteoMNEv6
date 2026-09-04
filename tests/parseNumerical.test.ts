import { describe, it, expect } from 'vitest';
import { parseNumerical } from '../src/sources/numerical/parseNumerical';
const SAMPLE_E = `
<td><span class="styleTn">Tmin</span></td><td>21.6</td>
<td><span class="styleTx">Tmax</span></td><td>33.7</td>
<td class="style3">Četvrtak, 2026-09-03</td>
<tr><td>00</td><td><img src="./Simbolcici/N/01.svg"></td><td>0.0</td><td>60.</td><td><img src="./Simbolcici/V/v1-045.svg"></td></tr>
<tr><td>03</td><td><img src="./Simbolcici/N/01.svg"></td><td>-0.0</td><td>48.</td><td><img src="./Simbolcici/V/v1-360.svg"></td></tr>
`;
const SAMPLE_A = `
<td><span class="styleTn">Tmin</span></td><td>18.2</td>
<td><span class="styleTx">Tmax</span></td><td>26.6</td>
<td class="style3">Četvrtak, 2026-09-03</td>
<tr><td>00</td><td><img src="./Simbolcici/N/01.svg"></td><td>0.0</td><td>53.</td><td><img src="./Simbolcici/V/v1-045.svg"></td></tr>
`;
describe('parseNumerical',()=>{
  it('cita E model',()=>{
    const d=parseNumerical(SAMPLE_E, 'POD', 'e3km');
    expect(d.tmin).toBe(21.6);
    expect(d.hours[0].symbol).toBe('N/01');
  });
  it('cita A model isto',()=>{
    const d=parseNumerical(SAMPLE_A, 'BUD', 'a3km');
    expect(d.tmin).toBe(18.2);
    expect(d.tmax).toBe(26.6);
    expect(d.hours[0].rhPct).toBe(53);
  });
});
