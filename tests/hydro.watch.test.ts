import { describe, it, expect, vi, afterEach } from 'vitest';
import { hydroWatchOpen, runHydroTick } from '../src/jobs/hydroWatch';

const PAGE1 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;
const PAGE2 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 13:00","125","15.6"]}};`;

const T = (h: number, m: number) => Date.UTC(2026, 8, 9, h, m, 0);

function fakeDb() {
  const rows: any[] = [];
  const cacheWrites: any[] = [];
  // Cuvar oblika pamti oblik odvojeno od belezske (prava baza ih drzi odvojeno).
  let schemaRow: any = null;
  const firstFor = (sql: string) => {
    if (sql.includes('schema_state')) return schemaRow;
    return rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null;
  };
  return {
    rows,
    cacheWrites,
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (_sql.includes('hydro_log')) rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], station_count: a[3] });
          else if (_sql.includes('INTO ')) cacheWrites.push(_sql.slice(0, 30));
          if (_sql.startsWith('INSERT INTO schema_state')) schemaRow = { fingerprint: a[1], pending_fp: null, pending_hits: 0 };
          else if (_sql.startsWith('UPDATE schema_state SET fingerprint=')) schemaRow = { fingerprint: a[0], pending_fp: null, pending_hits: 0 };
          else if (_sql.startsWith('UPDATE schema_state SET pending_fp=')) { if (schemaRow) { schemaRow.pending_fp = a[0]; schemaRow.pending_hits = a[1]; } }
        },
        first: async () => firstFor(_sql),
        all: async () => ({ results: rows }),
      }),
      first: async () => firstFor(_sql),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('hidro straza na 5 minuta', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kapija: deljiv sa 4 uvek, ostalo nikad', () => {
    expect(hydroWatchOpen(T(0, 0))).toBe(true);
    expect(hydroWatchOpen(T(3, 17))).toBe(false);
    expect(hydroWatchOpen(T(23, 56))).toBe(true);
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
  it('upis samo na promenu, heartbeat jednom dnevno u ponoc', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r1 = await runHydroTick(db, T(0, 4));
    expect(r1).toEqual({ checked: true, changed: true });
    expect(db.rows[0].status).toBe('first');
    // isto, nije ponoc -> bez upisa
    const r2 = await runHydroTick(db, T(0, 8));
    expect(r2).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(1);
    // isto, ponoc -> heartbeat
    const r3 = await runHydroTick(db, T(0, 0));
    expect(r3).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(2);
    expect(db.rows[1].status).toBe('same');
    // promena -> upis
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    const r4 = await runHydroTick(db, T(1, 4));
    expect(r4).toEqual({ checked: true, changed: true });
    expect(db.rows[2].status).toBe('changed');
    // promena odmah osvezava i kes za serviranje
    expect(db.cacheWrites.length).toBeGreaterThan(0);
  });
});
