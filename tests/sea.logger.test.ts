import { describe, it, expect, vi, afterEach } from 'vitest';
import { logSeaSnowSentinel, seaSnowFingerprint } from '../src/jobs/seaSnowLogger';

const PAGE1 = `var seaH="Srijeda, 02.09.2026. u 14h "; var seaT="<thead><tr><th></th><th>Grad</th><th>Temperatura mora</th></tr></thead><tr><th scope=\\"row\\">1</th><td>Herceg Novi  </td><td>28 °C</td></tr><tr><th scope=\\"row\\">2</th><td>Bar  </td><td>28 °C</td></tr>";`;
const PAGE2 = PAGE1.replace('<td>28 °C</td>', '<td>27 °C</td>');

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

describe('more merac', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prvi/same/changed redom', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    await logSeaSnowSentinel(db);
    expect(db.rows[0].status).toBe('first');
    await logSeaSnowSentinel(db);
    expect(db.rows[1].status).toBe('same');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    await logSeaSnowSentinel(db);
    expect(db.rows[2].status).toBe('changed');
  });
  it('otissak se menja promenom temperature', () => {
    const a = seaSnowFingerprint([{ place: 'Bar', tempC: 28, timeRaw: 't' }], []);
    const b = seaSnowFingerprint([{ place: 'Bar', tempC: 27, timeRaw: 't' }], []);
    expect(a).not.toBe(b);
  });
});
