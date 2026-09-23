import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveAir, loadAir, shouldPersistAir, getAir } from '../src/sources/epa-air/liveAir';

const ST9 = [{ id: '1', name: 'Podgorica UT', lat: 42.42, lon: 19.25, pin: 'x', dateRaw: '23.09.2026 10:00', values: [] }];

function fakeDb() {
  let payload: string | null = null;
  let fetchedAt = '';
  return {
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (sql.includes('INSERT INTO air_cache')) {
            payload = a[1];
            fetchedAt = a[0];
          }
        },
        first: async () => (payload ? { fetched_at: fetchedAt, payload } : null),
        all: async () => ({ results: [] }),
      }),
      first: async () => (payload ? { fetched_at: fetchedAt, payload } : null),
      all: async () => ({ results: [] }),
    }),
  } as any;
}

describe('vazduh kes za sluzenje', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prazno ne prepisuje dobar kes', () => {
    expect(shouldPersistAir(null, [])).toBe(false);
    expect(shouldPersistAir({ stations: ST9 }, [])).toBe(false);
  });
  it('manji skup ne brise veci', () => {
    const big = { stations: [...ST9, { ...ST9[0], id: '2' }] };
    expect(shouldPersistAir(big, ST9)).toBe(false);
  });
  it('veci ili isti skup prolazi', () => {
    expect(shouldPersistAir(null, ST9)).toBe(true);
    expect(shouldPersistAir({ stations: ST9 }, ST9)).toBe(true);
  });
  it('save pa load vrati isto', async () => {
    const db = fakeDb();
    await saveAir(db, ST9 as any);
    const c = await loadAir(db);
    expect(c?.stations?.length).toBe(1);
    expect(c?.stations?.[0]?.name).toBe('Podgorica UT');
  });
  it('getAir sluzi iz baze bez mreze', async () => {
    const db = fakeDb();
    await saveAir(db, ST9 as any);
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('mreza ne sme da se dira');
    });
    const r = await getAir(db);
    expect(r.fromCache).toBe(true);
    expect(r.stations.length).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });
});
