import { describe, it, expect, vi, afterEach } from 'vitest';
import { logAirSentinel, airFingerprint } from '../src/jobs/airLogger';

const TIP = (date: string, pm: string) =>
  `<h2>Bar</h2><p class='date'>${date}</p><div class='rTable'>` +
  `<div class='rTableRow'><div class ='rTableCell1 svzelena' >PM10</div><div class ='rTableCell2 svzelena' >${pm} &micro;g/m<sup>3</sup></div></div></div>`;

const page = (date: string, pm: string) =>
  `<html><script>var points = [` +
  `["Bar", 42.103842,19.09441,"https://www.epa.org.me/vazduh/stanica/3","pin-lgreen","${TIP(date, pm)}"]` +
  `];</script></html>`;

const PAGE1 = page('09.09.2026 01:00', '43,5');
const PAGE2 = page('09.09.2026 02:00', '43,5');

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

describe('vazduh merac', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prvi/same/changed redom', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    await logAirSentinel(db);
    expect(db.rows[0].status).toBe('first');
    await logAirSentinel(db);
    expect(db.rows[1].status).toBe('same');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    await logAirSentinel(db);
    expect(db.rows[2].status).toBe('changed');
  });
  it('otissak se menja promenom datuma', () => {
    const a = airFingerprint([{ id: '3', dateRaw: 'd1', values: [{ pollutant: 'PM10', valueRaw: '43,5' }] }]);
    const b = airFingerprint([{ id: '3', dateRaw: 'd2', values: [{ pollutant: 'PM10', valueRaw: '43,5' }] }]);
    expect(a).not.toBe(b);
  });
});
