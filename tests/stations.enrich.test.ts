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
});
