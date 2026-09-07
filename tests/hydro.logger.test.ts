import { describe, it, expect, vi, afterEach } from 'vitest';
import { logHydroSentinel, hydroFingerprint } from '../src/jobs/hydroLogger';

const PAGE1 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 12:00","123","15.5"]}};`;
const PAGE2 = `var staniceH={"jadranski":[["01TEST", "-", 42.1, 19.1, 10, "Test", "tip", "Moraca", 1]]}; var posljednje={"jadranski":{"01TEST":["tip","Test","02.09.2026 13:00","125","15.6"]}};`;

function fakeDb() {
  const rows: any[] = [];
  return {
    rows,
    prepare: (_sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], station_count: a[3] });
        },
        first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
        all: async () => ({ results: rows }),
      }),
      first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('hidro merac', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prvi/same/changed redom', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    await logHydroSentinel(db);
    expect(db.rows[0].status).toBe('first');
    await logHydroSentinel(db);
    expect(db.rows[1].status).toBe('same');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    await logHydroSentinel(db);
    expect(db.rows[2].status).toBe('changed');
  });
  it('otissak se menja promenom vodostaja', () => {
    const a = hydroFingerprint([], [{ stationId: 'X', measuredAtRaw: 't', waterLevelCm: 123 }]);
    const b = hydroFingerprint([], [{ stationId: 'X', measuredAtRaw: 't', waterLevelCm: 125 }]);
    expect(a).not.toBe(b);
  });
});
