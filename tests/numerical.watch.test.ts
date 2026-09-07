import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  numericalWatchModels,
  checkModelSentinel,
  runNumericalBatch,
  fetchCityModel,
} from '../src/jobs/numericalWatch';

const PAGE = `
<td><span class="styleTn">Tmin</span></td><td>21.6</td>
<td><span class="styleTx">Tmax</span></td><td>33.7</td>
<td class="style3">Cetvrtak, 2026-09-03</td>
<tr><td>00</td><td><img src="./Simbolcici/N/01.svg"></td><td>0.0</td><td>60.</td><td><img src="./Simbolcici/V/v1-045.svg"></td></tr>
<tr><td>03</td><td><img src="./Simbolcici/N/01.svg"></td><td>-0.0</td><td>48.</td><td><img src="./Simbolcici/V/v1-360.svg"></td></tr>
`;

function fakeDb() {
  const refresh: Record<string, any> = {};
  const dayRows: any[] = [];
  let daySeq = 0;
  return {
    refresh,
    dayRows,
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (sql.includes('INTO numerical_refresh')) {
            if (a.length === 3) refresh[a[0]] = { last_modified: a[1], cursor_idx: 0, status: 'pending' };
            else refresh[a[0]] = { ...(refresh[a[0]] ?? {}), cursor_idx: a[2], status: a[3] };
          }
          if (sql.includes('INTO numerical_days')) {
            daySeq++;
            dayRows.push({ city: a[0], model: a[1], day: a[2] });
          }
        },
        first: async () => {
          if (sql.includes('FROM numerical_refresh')) {
            const r = refresh[a[0]];
            if (!r) return null;
            if (sql.includes('last_modified')) return { last_modified: r.last_modified };
            if (sql.includes('cursor_idx')) return { cursor_idx: r.cursor_idx };
            if (sql.includes('status')) return { status: r.status };
            return r;
          }
          if (sql.includes('numerical_log')) return null;
          if (sql.includes('INTO numerical_days')) {
            daySeq++;
            dayRows.push({ city: a[0], model: a[1], day: a[2] });
            return { id: daySeq };
          }
          if (sql.includes('FROM numerical_days')) return { id: daySeq };
          if (sql.includes('MAX(ts)')) return { m: null };
          return null;
        },
        all: async () => ({ results: [] }),
      }),
      first: async () => null,
      all: async () => ({ results: [] }),
    }),
  } as any;
}

describe('numerical straza', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('e3km ujutru oko 09:30, a3km prepodne', () => {
    expect(numericalWatchModels(Date.UTC(2026, 8, 6, 7, 5))).toEqual(['e3km', 'a3km']);
    expect(numericalWatchModels(Date.UTC(2026, 8, 6, 12, 5))).toEqual([]);
    expect(numericalWatchModels(Date.UTC(2026, 8, 6, 5, 0))).toEqual(['a3km']);
    expect(numericalWatchModels(Date.UTC(2026, 8, 6, 1, 0))).toEqual([]);
  });
  it('sentinel: 200 menja, 304 ne menja', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('x', { status: 200, headers: { 'Last-Modified': 'Mon, 07 Sep 2026 09:27:47 GMT' } }) as any,
    );
    expect((await checkModelSentinel(db, 'e3km')).changed).toBe(true);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 304 }) as any);
    expect((await checkModelSentinel(db, 'e3km')).changed).toBe(false);
  });
  it('tura ide grad po grad sa kursorom', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE, { status: 200 }) as any);
    const r1 = await runNumericalBatch(db, 'e3km', 1);
    expect(r1.done).toBe(false);
    expect(r1.cities).toEqual(['POD']);
    expect(db.dayRows.length).toBe(5);
    const r2 = await runNumericalBatch(db, 'e3km', 1);
    expect(r2.cities).toEqual(['TUZ']);
  });
  it('grad upise 5 dana', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE, { status: 200 }) as any);
    await fetchCityModel(db, 'e3km', 'POD');
    expect(db.dayRows.filter((d: any) => d.city === 'POD').length).toBe(5);
  });
});
