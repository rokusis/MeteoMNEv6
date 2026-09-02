import { describe, it, expect } from 'vitest';
import { parseDataAll } from '../src/sources/zhms-aws/parseGraph';

const SAMPLE_G1 = `var DataAll = {"T": [[1725235200000, "21.5"], [1725238800000, "22.0"]], "H": [[1725235200000, "60"]], "RR": [[1725235200000, "0.0"]]};`;
const SAMPLE_G2 = `var DataAll = {"BRV": [[1725235200000, "2.3"]], "PRV": [[1725235200000, "16"]], "MUV": [[1725235200000, "5.1"]]};`;
const SAMPLE_EMPTY = `var DataAll = {};`;

describe('parseDataAll', () => {
  it('cita G1 T/H/RR', () => {
    const d = parseDataAll(SAMPLE_G1);
    expect(d.T).toHaveLength(2);
    expect(d.T![0].value).toBe(21.5);
    expect(d.H![0].value).toBe(60);
  });
  it('cita G2 vjetar', () => {
    const d = parseDataAll(SAMPLE_G2);
    expect(d.BRV![0].value).toBe(2.3);
    expect(d.PRV![0].value).toBe(16);
  });
  it('prazno DataAll', () => {
    const d = parseDataAll(SAMPLE_EMPTY);
    expect(Object.keys(d)).toHaveLength(0);
  });
  it('baca ako nema DataAll', () => {
    expect(()=> parseDataAll('no data')).toThrow();
  });
  it('cisti trailing comma', () => {
    const s = `var DataAll = {"T": [[1, "1"],],};`;
    const d = parseDataAll(s);
    expect(d.T).toHaveLength(1);
  });
});
