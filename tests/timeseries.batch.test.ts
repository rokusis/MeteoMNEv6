import { describe, it, expect } from 'vitest';
import { saveTimeseriesBatch } from '../src/lib/timeseriesDb';

function fakeDb(opts: { batchOk: boolean; calls: string[] }) {
  return {
    prepare: (_sql: string) => ({
      bind: (..._a: any[]) => ({
        run: async () => {
          opts.calls.push('run');
        },
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
    batch: async (stmts: any[]) => {
      opts.calls.push('batch:' + stmts.length);
      if (!opts.batchOk) throw new Error('nema batch');
      return [];
    },
  } as any;
}

const PTS = [
  { ts: 1, value: 10 },
  { ts: 2, value: null },
  { ts: 3, value: 30 },
];

describe('grupni upis', () => {
  it('jedna serija umesto pojedinacnih', async () => {
    const calls: string[] = [];
    await saveTimeseriesBatch(fakeDb({ batchOk: true, calls }), '02PDGR10', 'H', PTS);
    expect(calls).toEqual(['batch:2']);
  });
  it('pad serije pada nazad na obican upis', async () => {
    const calls: string[] = [];
    await saveTimeseriesBatch(fakeDb({ batchOk: false, calls }), '02PDGR10', 'H', PTS);
    expect(calls.filter((c) => c === 'run').length).toBe(2);
  });
  it('prazno ne zove bazu', async () => {
    const calls: string[] = [];
    await saveTimeseriesBatch(fakeDb({ batchOk: true, calls }), '02PDGR10', 'H', []);
    expect(calls).toEqual([]);
  });
});
