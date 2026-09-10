import { describe, it, expect, vi, afterEach } from 'vitest';
import { refreshHydro, shouldPersistHydro } from '../src/sources/hydro/liveHydro';
import { refreshSeaSnow, shouldPersistSeaSnow } from '../src/sources/zhms-sea-snow/liveSeaSnow';

const HYDRO1 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;
const HYDRO2 = HYDRO1.replace('"123"', '"125"');
const SEA1 = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead></thead><tr><th scope=\\"row\\">1</th><td>Bar  </td><td>28 °C</td></tr>";`;
const SEA2 = SEA1.replace('28 °C', '27 °C');

function countingDb() {
  const writes: string[] = [];
  let hydroRow: any = null;
  let seaRow: any = null;
  const firstFor = (sql: string) => {
    if (sql.includes('hydro_cache')) return hydroRow;
    if (sql.includes('sea_snow_cache')) return seaRow;
    return null;
  };
  return {
    writes,
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (sql.includes('INTO ')) writes.push(sql.slice(0, 30));
          if (sql.includes('INTO hydro_cache')) hydroRow = { fetched_at: a[0], payload: a[1] };
          if (sql.includes('INTO sea_snow_cache')) seaRow = { fetched_at: a[0], payload: a[1] };
        },
        first: async () => firstFor(sql),
        all: async () => ({ results: [] }),
      }),
      first: async () => firstFor(sql),
      all: async () => ({ results: [] }),
    }),
  } as any;
}

describe('refresh preskace nepromenjeno (stednja D1 upisa)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('hidro: drugi isti krug ne pise nista', async () => {
    const db = countingDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(HYDRO1, { status: 200 }) as any);
    await refreshHydro(db);
    expect(db.writes.length).toBeGreaterThan(0);
    db.writes.length = 0;
    await refreshHydro(db);
    expect(db.writes.length).toBe(0);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(HYDRO2, { status: 200 }) as any);
    await refreshHydro(db);
    expect(db.writes.length).toBeGreaterThan(0);
  });
  it('hidro: okrnjen skup ne brise dobar kes', async () => {
    const db = countingDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(HYDRO1, { status: 200 }) as any);
    await refreshHydro(db);
    expect(db.writes.length).toBeGreaterThan(0);
    db.writes.length = 0;
    const EMPTY = `var staniceH={"jadranski":[]}; var posljednje={"jadranski":{}};`;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(EMPTY, { status: 200 }) as any);
    await expect(refreshHydro(db)).rejects.toThrow('hydro empty');
    expect(db.writes.length).toBe(0);
  });
  it('more: drugi isti krug ne pise nista', async () => {
    const db = countingDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SEA1, { status: 200 }) as any);
    await refreshSeaSnow(db);
    expect(db.writes.length).toBeGreaterThan(0);
    db.writes.length = 0;
    await refreshSeaSnow(db);
    expect(db.writes.length).toBe(0);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SEA2, { status: 200 }) as any);
    await refreshSeaSnow(db);
    expect(db.writes.length).toBeGreaterThan(0);
  });
  it('okrnjen skup ne brise dobar kes (hidro i more)', () => {
    const prevH = { stations: [{ id: 'A' }, { id: 'B' }], observations: [
      { stationId: 'A', measuredAtRaw: 't', waterLevelCm: 1 },
      { stationId: 'B', measuredAtRaw: 't', waterLevelCm: 2 },
    ] };
    const fewH = { stations: [{ id: 'A' }], observations: [
      { stationId: 'A', measuredAtRaw: 't', waterLevelCm: 1 },
    ] };
    expect(shouldPersistHydro(prevH, fewH.stations, fewH.observations)).toBe(false);
    expect(shouldPersistHydro(null, fewH.stations, fewH.observations)).toBe(true);
    expect(shouldPersistHydro(prevH, [], [])).toBe(false);
    const prevS = { sea: [{ place: 'Bar' }, { place: 'Hn' }], snow: [] };
    const fewS = { sea: [{ place: 'Bar' }], snow: [] };
    expect(shouldPersistSeaSnow(prevS, fewS.sea, fewS.snow)).toBe(false);
    expect(shouldPersistSeaSnow(null, fewS.sea, fewS.snow)).toBe(true);
    expect(shouldPersistSeaSnow(prevS, [], [])).toBe(false);
  });
});
