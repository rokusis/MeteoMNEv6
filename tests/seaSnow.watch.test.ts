import { describe, it, expect, vi, afterEach } from 'vitest';
import { seaSnowWatchOpen, runSeaSnowTick } from '../src/jobs/seaSnowWatch';

const PAGE1 = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead><tr><th></th><th>Grad</th><th>Temperatura mora</th></tr></thead><tr><th scope=\\"row\\">1</th><td>Herceg Novi  </td><td>28 °C</td></tr><tr><th scope=\\"row\\">2</th><td>Bar  </td><td>28 °C</td></tr>";`;
const PAGE2 = PAGE1.replace('<td>28 °C</td>', '<td>27 °C</td>');

const T = (h: number, m: number) => Date.UTC(2026, 8, 9, h, m, 0);

function fakeDb() {
  const rows: any[] = [];
  return {
    rows,
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], sea_count: a[3], snow_count: a[4] });
        },
        first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
        all: async () => ({ results: rows }),
      }),
      first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('more/sneg gusta straza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kapija: parni minut uvek, neparni nikad', () => {
    expect(seaSnowWatchOpen(T(8, 30))).toBe(true);
    expect(seaSnowWatchOpen(T(3, 0))).toBe(true);
    expect(seaSnowWatchOpen(T(8, 31))).toBe(false);
  });
  it('neparni minut ne dira mrezu', async () => {
    const db = fakeDb();
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r = await runSeaSnowTick(db, T(8, 31));
    expect(r).toEqual({ checked: false, changed: false });
    expect(spy).not.toHaveBeenCalled();
    expect(db.rows.length).toBe(0);
  });
  it('upis samo na promenu, heartbeat na pun sat', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r1 = await runSeaSnowTick(db, T(8, 30));
    expect(r1).toEqual({ checked: true, changed: true });
    expect(db.rows[0].status).toBe('first');
    // isto, nije pun sat -> bez upisa
    const r2 = await runSeaSnowTick(db, T(8, 32));
    expect(r2).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(1);
    // isto, pun sat -> heartbeat
    const r3 = await runSeaSnowTick(db, T(9, 0));
    expect(r3).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(2);
    expect(db.rows[1].status).toBe('same');
    // promena -> upis
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    const r4 = await runSeaSnowTick(db, T(9, 2));
    expect(r4).toEqual({ checked: true, changed: true });
    expect(db.rows[2].status).toBe('changed');
  });
});
