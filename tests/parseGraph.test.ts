import { describe, it, expect } from 'vitest';
import { parseDataAll } from '../src/sources/zhms-aws/parseGraph';
const SAMPLE_G1 = `var DataAll = {G1:{RR:[[1725235200000, "0.0"]], T:[[1725235200000, "21.5"]], H:[[1725235200000, "60"]]}};`;
const SAMPLE_G2 = `var DataAll = {G2:{BRV:[[1725235200000, "2.3"]], PRV:[[1725235200000, "16"]], MUV:[[1725235200000, "5.1"]]}};`;
const SAMPLE_OLD = `var DataAll = {"T": [[1725235200000, "21.5"]]};`;
describe('parseDataAll', () => {
  it('cita G1 T/H/RR bez navodnika', () => {
    const d = parseDataAll(SAMPLE_G1);
    expect(d.T![0].value).toBe(21.5);
    expect(d.RR![0].value).toBe(0);
  });
  it('cita G2', () => {
    const d = parseDataAll(SAMPLE_G2);
    expect(d.BRV![0].value).toBe(2.3);
  });
  it('cita stari flat format', () => {
    const d = parseDataAll(SAMPLE_OLD);
    expect(d.T![0].value).toBe(21.5);
  });
});
