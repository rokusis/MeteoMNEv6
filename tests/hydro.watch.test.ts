import { describe, it, expect, vi, afterEach } from 'vitest';
import { hydroWatchOpen, runHydroTick } from '../src/jobs/hydroWatch';

const PAGE1 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;
const PAGE2 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 13:00","125","15.6"]}};`;

const T = (h: number, m: number) => Date.UTC(2026, 8, 9, h, m, 0);

function fakeDb() {
  const rows: any[] = [];
  const cacheWrites: any[] = [];
  return {
    rows,
    cacheWrites,
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (_sql.includes('hydro_log')) rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], station_count: a[3] });
          else if (_sql.includes('INTO ')) cacheWrites.push(_sql.slice(0, 30));
        },
        first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
        all: async () => ({ results: rows }),
      }),
      first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('hidro gusta straza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kapija: parni minut uvek, neparni nikad', () => {
    expect(hydroWatchOpen(T(0, 0))).toBe(true);
    expect(hydroWatchOpen(T(3, 17))).toBe(false);
    expect(hydroWatchOpen(T(23, 58))).toBe(true);
    expect(hydroWatchOpen(T(12, 51))).toBe(false);
  });
  it('neparni minut ne dira mrezu', async () => {
    const db = fakeDb();
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r = await runHydroTick(db, T(3, 17));
    expect(r).toEqual({ checked: false, changed: false });
    expect(spy).not.toHaveBeenCalled();
    expect(db.rows.length).toBe(0);
  });
  it('upis samo na promenu, heartbeat na pun sat', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r1 = await runHydroTick(db, T(0, 2));
    expect(r1).toEqual({ checked: true, changed: true });
    expect(db.rows[0].status).toBe('first');
    // isto, nije pun sat -> bez upisa
    const r2 = await runHydroTick(db, T(0, 4));
    expect(r2).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(1);
    // isto, pun sat -> heartbeat
    const r3 = await runHydroTick(db, T(1, 0));
    expect(r3).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(2);
    expect(db.rows[1].status).toBe('same');
    // promena -> upis
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    const r4 = await runHydroTick(db, T(1, 2));
    expect(r4).toEqual({ checked: true, changed: true });
    expect(db.rows[2].status).toBe('changed');
    // promena odmah osvezava i kes za serviranje
    expect(db.cacheWrites.length).toBeGreaterThan(0);
  });
});
