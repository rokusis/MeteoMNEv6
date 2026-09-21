import { describe, it, expect } from 'vitest';
import { loadLatestParams } from '../src/lib/timeseriesDb';

function fakeDb(rows: any[]) {
  return {
    prepare: (_sql: string) => ({
      bind: (..._a: any[]) => ({ all: async () => ({ results: rows }) }),
    }),
  } as any;
}

describe('loadLatestParams', () => {
  it('vrati zadnje H/P/GR po stanici', async () => {
    const db = fakeDb([
      { station_id: '02PDGR10', param: 'H', value: 27, ts: 200 },
      { station_id: '02PDGR10', param: 'P', value: 1013.7, ts: 200 },
      { station_id: '02PDGR10', param: 'GR', value: 0.1, ts: 200 },
    ]);
    const m = await loadLatestParams(db, ['H', 'P', 'GR']);
    expect(m.get('02PDGR10')?.H?.value).toBe(27);
    expect(m.get('02PDGR10')?.P?.value).toBe(1013.7);
    expect(m.get('02PDGR10')?.GR?.value).toBe(0.1);
  });
  it('prazna baza da praznu mapu', async () => {
    const m = await loadLatestParams(fakeDb([]), ['H', 'P', 'GR']);
    expect(m.size).toBe(0);
  });
  it('sa spiskom stanica ide po stanici preko indeksa', async () => {
    const seen: string[] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: (...a: any[]) => ({
          all: async () => {
            seen.push(sql);
            if (a[0] === '02PDGR10' && a[1] === 'H') return { results: [{ station_id: '02PDGR10', param: 'H', value: 27, ts: 200 }] };
            return { results: [] };
          },
        }),
      }),
    } as any;
    const m = await loadLatestParams(db, ['H', 'P'], ['02PDGR10', '02BAR010']);
    expect(m.get('02PDGR10')?.H?.value).toBe(27);
    expect(m.has('02BAR010')).toBe(false);
    expect(seen.every((s) => s.includes('LIMIT 1'))).toBe(true);
  });
});
