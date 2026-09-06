import { describe, it, expect } from 'vitest';
import { groupFor, isDue, nextStateOnResult, parseSnapshotMs, type GraphState } from '../src/sources/zhms-aws/graphSchedule';

const MIN = 60000;
function st(over: Partial<GraphState> & { stationId: string }): GraphState {
  return { lastSnapshotMs: null, lastCheckMs: null, lastChangeMs: null, miss: 0, doneMs: null, ...over };
}

describe('graphSchedule dogadjaj', () => {
  it('grupe: brze, kotor, satne', () => {
    expect(groupFor('02PDGR10')).toBe('fast');
    expect(groupFor('02LKOT20')).toBe('kotor');
    expect(groupFor('02DANL20')).toBe('hourly');
    expect(groupFor('02BERA20')).toBe('hourly');
  });
  it('pokriven snimak nije zreo dok ne stigne nov', () => {
    const s = Date.UTC(2026, 8, 6, 10, 0);
    const now = s + 30 * MIN;
    const done = st({ stationId: '02PDGR10', lastSnapshotMs: s, lastCheckMs: s + 12 * MIN, doneMs: s });
    expect(isDue(done, now)).toBe(false);
  });
  it('nov snimak je zreo posle 90s, ne pre', () => {
    const s = Date.UTC(2026, 8, 6, 10, 0);
    expect(isDue(st({ stationId: '02PDGR10', lastSnapshotMs: s }), s + 30 * 1000)).toBe(false);
    expect(isDue(st({ stationId: '02PDGR10', lastSnapshotMs: s }), s + 2 * MIN)).toBe(true);
  });
  it('promasaji se razredjuju pa parkiraju', () => {
    const s = Date.UTC(2026, 8, 6, 10, 0);
    const base = st({ stationId: '02DANL20', lastSnapshotMs: s, lastCheckMs: s + 60 * MIN });
    expect(isDue({ ...base, miss: 0 }, s + 62 * MIN)).toBe(true);
    expect(isDue({ ...base, miss: 1 }, s + 61 * MIN)).toBe(false);
    expect(isDue({ ...base, miss: 99 }, s + 500 * MIN)).toBe(false);
  });
  it('uspeh zatvara snimak, promasaj broji', () => {
    const s = Date.UTC(2026, 8, 6, 10, 0);
    const prev = st({ stationId: '02PDGR10', lastSnapshotMs: s, lastCheckMs: s, miss: 2 });
    const ok = nextStateOnResult(prev, s + 5 * MIN, true, s);
    expect(ok.doneMs).toBe(s);
    expect(ok.miss).toBe(0);
    expect(isDue(ok, s + 50 * MIN)).toBe(false);
    const fail = nextStateOnResult(prev, s + 5 * MIN, false, s);
    expect(fail.miss).toBe(3);
    expect(fail.doneMs).toBe(null);
  });
  it('pomeren snimak daje svežu šansu i ponovo je zreo', () => {
    const s1 = Date.UTC(2026, 8, 6, 10, 0);
    const s2 = s1 + 15 * MIN;
    const prev = st({ stationId: '02PDGR10', lastSnapshotMs: s1, lastCheckMs: s1 + 30 * MIN, miss: 9, doneMs: s1 });
    const nx = nextStateOnResult(prev, s2 + 5 * MIN, false, s2);
    expect(nx.miss).toBe(0);
    expect(nx.doneMs).toBe(s1);
    expect(isDue(nx, s2 + 8 * MIN)).toBe(true);
  });
  it('cita lokalno vreme leti i zimi', () => {
    expect(parseSnapshotMs('05.09.2026 03:10')).toBe(Date.UTC(2026, 8, 5, 1, 10));
    expect(parseSnapshotMs('15.01.2026 12:00')).toBe(Date.UTC(2026, 0, 15, 11, 0));
  });
});
