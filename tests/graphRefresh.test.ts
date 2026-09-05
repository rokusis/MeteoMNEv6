import { describe, it, expect } from 'vitest';
import { selectDueStations } from '../src/jobs/graphRefresh';

const MIN = 60000;
function snap(id: string, ms: number | null) {
  if (ms == null) return { stationId: id, measuredAtRaw: null };
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return { stationId: id, measuredAtRaw: `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` };
}

describe('graphRefresh izbor', () => {
  it('cap 8 po krugu, najstariji prvi', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    const now = last + 70 * MIN;
    const snaps = Array.from({ length: 10 }, (_, i) => snap('02DAN' + i, last));
    const states = new Map();
    const due = selectDueStations(snaps as any, states, now, 8);
    expect(due.length).toBe(8);
  });
  it('brza zrela, klima nije pre 57', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    const now = last + 11 * MIN;
    const due = selectDueStations([snap('02PDGR10', last), snap('02DANL20', last)] as any, new Map(), now, 8);
    expect(due.map((d) => d.stationId)).toContain('02PDGR10');
    expect(due.map((d) => d.stationId)).not.toContain('02DANL20');
  });
  it('promena snimka resetuje prozor', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    const now = last + 5 * MIN;
    const states = new Map([
      ['02PDGR10', { stationId: '02PDGR10', lastSnapshotMs: last, lastCheckMs: last, lastChangeMs: last, miss: 4 }],
    ]);
    const due = selectDueStations([snap('02PDGR10', last + 30 * MIN)] as any, states as any, now, 8);
    expect(due.length).toBe(0);
  });
});
