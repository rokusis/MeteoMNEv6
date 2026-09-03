import { describe, it, expect } from 'vitest';
import { parseSeaSnow } from '../src/sources/zhms-sea-snow/parseSeaSnow';
const SAMPLE = `
var seaH = [["Herceg Novi","24.5","02.09.2026 14:00"]];
var seaT = [["Bar","25.0","02.09.2026 14:00"]];
var snowH2 = [["Žabljak","10","-2","02.09.2026 08:00"]];
var snowT2 = [["Kolašin","5","1","02.09.2026 08:00"]];
`;
describe('sea snow', () => {
  it('cita more i snijeg', () => {
    const {sea, snow} = parseSeaSnow(SAMPLE);
    expect(sea.length).toBeGreaterThan(0);
    expect(snow.length).toBeGreaterThan(0);
    expect(sea[0].place).toBe('Bar');
    expect(snow[0].place).toBe('Kolašin');
  });
});
