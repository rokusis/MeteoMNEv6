import { describe, it, expect } from 'vitest';
import { buildNumericalUrl } from '../src/sources/numerical/urls';
import { NUMERICAL_STATIONS } from '../src/sources/numerical/stations';
describe('numerical urls',()=>{
  it('BUD e3km dan1',()=>{ expect(buildNumericalUrl("e3km","BUD",1)).toBe("https://www.meteo.co.me/Meteorologija/Pr/Gradovi/5danaE/BUD-E1.html"); });
  it('POD a3km dan5',()=>{ expect(buildNumericalUrl("a3km","POD",5)).toBe("https://www.meteo.co.me/Meteorologija/Pr/Gradovi/5danaA/POD-A5.html"); });
  it('ima 24 stanice',()=>{ expect(Object.keys(NUMERICAL_STATIONS).length).toBeGreaterThanOrEqual(24); });
  it('baca za dan 6',()=>{ expect(()=> buildNumericalUrl("e3km","BUD",6 as any)).toThrow(); });
});
