import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSeaSnow, refreshSeaSnow } from '../src/sources/zhms-sea-snow/liveSeaSnow';

const SAMPLE = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead><tr><th></th><th>Grad</th><th>Temperatura mora</th></tr></thead><tr><th scope=\\"row\\">1</th><td>Herceg Novi  </td><td>28 °C</td></tr><tr><th scope=\\"row\\">2</th><td>Bar  </td><td>28 °C</td></tr>";`;

function fakeDb() {
  let row: any = null;
  return {
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (_sql.includes('sea_snow_cache')) row = { fetched_at: a[0], payload: a[1] };
        },
        first: async () => row,
        all: async () => ({ results: row ? [row] : [] }),
      }),
      first: async () => row,
      all: async () => ({ results: row ? [row] : [] }),
    }),
  } as any;
}

describe('more baza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kron upise pa API cita iz baze bez mreze', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SAMPLE, { status: 200 }) as any);
    expect((await refreshSeaSnow(db)).updated).toBe(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('nema mreze'));
    const r = await getSeaSnow(db);
    expect(r.fromCache).toBe(true);
    expect(r.sea[0].place).toBe('Herceg Novi');
    expect(r.sea[0].tempC).toBe(28);
  });
});
