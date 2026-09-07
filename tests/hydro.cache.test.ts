import { describe, it, expect, vi, afterEach } from 'vitest';
import { getHydro, refreshHydro } from '../src/sources/hydro/liveHydro';

const SAMPLE = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;

function fakeDb() {
  let row: any = null;
  return {
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (_sql.includes('hydro_cache')) row = { fetched_at: a[0], payload: a[1] };
        },
        first: async () => row,
        all: async () => ({ results: row ? [row] : [] }),
      }),
      first: async () => row,
      all: async () => ({ results: row ? [row] : [] }),
    }),
  } as any;
}

describe('hydro baza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kron upise pa API cita iz baze bez mreze', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SAMPLE, { status: 200 }) as any);
    expect((await refreshHydro(db)).updated).toBe(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('nema mreze'));
    const r = await getHydro(db);
    expect(r.fromCache).toBe(true);
    expect(r.observations[0].waterLevelCm).toBe(123);
    expect(r.observations[0].waterTempC).toBe(15.5);
  });
});
