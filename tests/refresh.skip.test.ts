import { describe, it, expect, vi, afterEach } from 'vitest';
import { refreshHydro } from '../src/sources/hydro/liveHydro';
import { refreshSeaSnow } from '../src/sources/zhms-sea-snow/liveSeaSnow';

const HYDRO1 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;
const HYDRO2 = HYDRO1.replace('"123"', '"125"');
const SEA1 = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead></thead><tr><th scope=\\"row\\">1</th><td>Bar  </td><td>28 °C</td></tr>";`;
const SEA2 = SEA1.replace('28 °C', '27 °C');

function countingDb() {
  const writes: string[] = [];
  return {
    writes,
    prepare: (sql: string) => ({
      bind: (..._a: any[]) => ({
        run: async () => {
          if (sql.includes('INTO ')) writes.push(sql.slice(0, 30));
        },
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
      first: async () => null,
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
});
