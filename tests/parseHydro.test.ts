import { describe, it, expect } from 'vitest';
import { parseHydroStations, parseHydroObs } from '../src/sources/hydro/parseHydro';
const SAMPLE = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Morača", 1]]}; var posljednje={"jadranski":[["01TEST","tip","Test","02.09.2026 12:00","123","15.5"]]};`;
describe('hydro',()=>{
  it('cita staniceH i posljednje',()=>{
    expect(parseHydroStations(SAMPLE).length).toBe(1);
    expect(parseHydroObs(SAMPLE)[0].waterLevelCm).toBe(123);
    expect(parseHydroObs(SAMPLE)[0].waterTempC).toBe(15.5);
  });
});
