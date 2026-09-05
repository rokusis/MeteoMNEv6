import { describe, it, expect } from 'vitest';
import { groupFor, isDue, nextStateOnResult, parseSnapshotMs, type GraphState } from '../src/sources/zhms-aws/graphSchedule';

const MIN = 60000;
function st(over: Partial<GraphState> & { stationId: string }): GraphState {
  return { lastSnapshotMs: null, lastCheckMs: null, lastChangeMs: null, miss: 0, ...over };
}

describe('graphSchedule ritam', () => {
  it('grupe: brze, kotor, satne', () => {
    expect(groupFor('02PDGR10')).toBe('fast');
    expect(groupFor('02LKOT20')).toBe('kotor');
    expect(groupFor('02DANL20')).toBe('hourly');
    expect(groupFor('02BERA20')).toBe('hourly');
  });
  it('brza ne pita pre prozora', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    expect(isDue(st({ stationId: '02PDGR10', lastSnapshotMs: last }), last + 8 * MIN)).toBe(false);
    expect(isDue(st({ stationId: '02PDGR10', lastSnapshotMs: last }), last + 10 * MIN)).toBe(true);
  });
  it('burst ide na 2 min, catch-up na 6 min', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    const s1: GraphState = st({ stationId: '02PDGR10', lastSnapshotMs: last, lastCheckMs: last + 10 * MIN, miss: 1 });
    expect(isDue(s1, last + 11 * MIN)).toBe(false);
    expect(isDue(s1, last + 12 * MIN)).toBe(true);
    const sCatch: GraphState = st({ stationId: '02PDGR10', lastSnapshotMs: last, lastCheckMs: last + 20 * MIN, miss: 5 });
    expect(isDue(sCatch, last + 24 * MIN)).toBe(false);
    expect(isDue(sCatch, last + 26 * MIN)).toBe(true);
  });
  it('posle promene miss se resetuje', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    const prev = st({ stationId: '02PDGR10', lastSnapshotMs: last, lastCheckMs: last + 10 * MIN, miss: 3 });
    const nx = nextStateOnResult(prev, last + 12 * MIN, true, last);
    expect(nx.miss).toBe(0);
    const nx2 = nextStateOnResult(prev, last + 12 * MIN, false, last);
    expect(nx2.miss).toBe(4);
  });
  it('kotor prozor 13, klima 57', () => {
    const last = Date.UTC(2026, 8, 5, 12, 0);
    expect(isDue(st({ stationId: '02LKOT20', lastSnapshotMs: last }), last + 12 * MIN)).toBe(false);
    expect(isDue(st({ stationId: '02LKOT20', lastSnapshotMs: last }), last + 13 * MIN)).toBe(true);
    expect(isDue(st({ stationId: '02DANL20', lastSnapshotMs: last }), last + 56 * MIN)).toBe(false);
    expect(isDue(st({ stationId: '02DANL20', lastSnapshotMs: last }), last + 57 * MIN)).toBe(true);
  });
  it('cita datum_vrijeme format', () => {
    expect(parseSnapshotMs('05.09.2026 03:10')).toBe(Date.UTC(2026, 8, 5, 3, 10));
  });
});
