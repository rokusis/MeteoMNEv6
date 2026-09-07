import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSynop, refreshSynop, synopWatchOpen } from '../src/sources/zhms-synop/liveSynop';

const SAMPLE = `var sinopCGHour=12; var sinopCGDay="2026/09/04"; var sinop=[{ sifra: '13463', naziv: 'Podgorica', sat: '12', obl: '2', VBNobl: '6' }];`;

function fakeDb() {
  let row: any = null;
  return {
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          row = { meta_hour: a[0], meta_day: a[1], fetched_at: a[2], payload: a[3] };
        },
        first: async () => row,
        all: async () => ({ results: row ? [row] : [] }),
      }),
      first: async () => row,
      all: async () => ({ results: row ? [row] : [] }),
    }),
  } as any;
}

describe('synop baza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('kron upise pa API cita iz baze bez mreze', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(SAMPLE, { status: 200 }) as any);
    expect((await refreshSynop(db)).updated).toBe(true);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('nema mreze'));
    const r = await getSynop(db);
    expect(r.fromCache).toBe(true);
    expect(r.stations[0].synopText).toBe('Pretežno vedro');
  });
  it('isti termin ne prepisuje bazu', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(SAMPLE, { status: 200 }) as any);
    expect((await refreshSynop(db)).updated).toBe(true);
    expect((await refreshSynop(db)).updated).toBe(false);
  });
});

describe('synop straza', () => {
  it('otvorena oko termina, zatvorena inace', () => {
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 4, 29))).toBe(false);
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 4, 30))).toBe(true);
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 6, 29))).toBe(true);
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 6, 30))).toBe(false);
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 12, 1))).toBe(true);
    expect(synopWatchOpen(Date.UTC(2026, 8, 6, 1, 0))).toBe(false);
  });
  it('zimi racuna +1', () => {
    expect(synopWatchOpen(Date.UTC(2026, 0, 15, 5, 29))).toBe(false);
    expect(synopWatchOpen(Date.UTC(2026, 0, 15, 5, 30))).toBe(true);
  });
});
