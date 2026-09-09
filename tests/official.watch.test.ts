import { describe, it, expect, vi, afterEach } from 'vitest';
import { officialWatchOpen, runOfficialTick } from '../src/jobs/officialWatch';

const PAGE1 = `
<div id="tab_a"><div class="prognoza-title">Petak, 04.09.2026.</div><div class="prognoza-text">Suncano.</div><div class="prognoza-sign">prognoza azurirana: 03.09.2026. 11:45 CEST</div><img src="/Meteorologija/Pr/cgprognoza-A.svg" /></div>
<div id="tab_b"><div class="prognoza-title">Subota, 05.09.2026.</div><div class="prognoza-text">Oblacno.</div><div class="prognoza-sign">prognoza azurirana: 03.09.2026. 11:42 CEST</div><img src="/Meteorologija/Pr/cgprognoza-B.svg" /></div>
`;
const PAGE2 = PAGE1.replace('11:45 CEST', '17:20 CEST');

const T = (h: number, m: number) => Date.UTC(2026, 8, 9, h, m, 0);

function fakeDb() {
  const rows: any[] = [];
  return {
    rows,
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], titles: a[3] });
        },
        first: async () => (sql.includes('SELECT fingerprint') && rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
        all: async () => ({ results: rows }),
      }),
      first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('official gusti prozor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kapija: parni minut u prozoru, ostalo ne', () => {
    expect(officialWatchOpen(T(11, 10))).toBe(true);
    expect(officialWatchOpen(T(10, 30))).toBe(true);
    expect(officialWatchOpen(T(11, 11))).toBe(false);
    expect(officialWatchOpen(T(10, 29))).toBe(false);
    expect(officialWatchOpen(T(13, 30))).toBe(false);
    expect(officialWatchOpen(T(3, 0))).toBe(false);
  });
  it('van prozora ne dira mrezu', async () => {
    const db = fakeDb();
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r = await runOfficialTick(db, T(3, 0));
    expect(r).toEqual({ checked: false, changed: false });
    expect(spy).not.toHaveBeenCalled();
    expect(db.rows.length).toBe(0);
  });
  it('upis samo na promenu, heartbeat na pun sat', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    const r1 = await runOfficialTick(db, T(11, 10));
    expect(r1).toEqual({ checked: true, changed: true });
    expect(db.rows[0].status).toBe('first');
    // isto, nije pun sat -> bez upisa
    const r2 = await runOfficialTick(db, T(11, 12));
    expect(r2).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(1);
    // isto, pun sat -> heartbeat
    const r3 = await runOfficialTick(db, T(12, 0));
    expect(r3).toEqual({ checked: true, changed: false });
    expect(db.rows.length).toBe(2);
    expect(db.rows[1].status).toBe('same');
    // promena -> upis
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    const r4 = await runOfficialTick(db, T(12, 50));
    expect(r4).toEqual({ checked: true, changed: true });
    expect(db.rows[2].status).toBe('changed');
  });
});
