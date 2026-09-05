export type StationGroup = 'fast' | 'kotor' | 'hourly';
export interface GraphState {
  stationId: string;
  lastSnapshotMs: number | null;
  lastCheckMs: number | null;
  lastChangeMs: number | null;
  miss: number;
}

const FAST_IDS = new Set([
  '02BAR010', '02CTNJ10', '02HNOV10', '02KOLS10', '02NIKS10',
  '02PDGR10', '02PLJV10', '02ULCN10', '02ZBLJ10',
]);
export const KOTOR_ID = '02LKOT20';

export function groupFor(stationId: string): StationGroup {
  if (stationId === KOTOR_ID) return 'kotor';
  if (FAST_IDS.has(stationId)) return 'fast';
  return 'hourly';
}

export function windowStartMin(group: StationGroup): number {
  if (group === 'fast') return 10;
  if (group === 'kotor') return 13;
  return 57;
}

export function maxBurst(group: StationGroup): number {
  if (group === 'fast') return 5;
  return 4;
}

export const CATCH_UP_MIN = 6;
export const MAX_CATCH_UP_EXTRA = 6;

export function parseSnapshotMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) {
    const t = Date.parse(String(raw));
    return Number.isFinite(t) ? t : null;
  }
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  return Date.UTC(yyyy, mm - 1, dd, hh, mi);
}

export function isDue(state: GraphState, nowMs: number): boolean {
  const group = groupFor(state.stationId);
  if (state.lastSnapshotMs == null) return true;
  const base = state.lastSnapshotMs + windowStartMin(group) * 60000;
  if (nowMs < base) return false;
  if (state.lastCheckMs == null) return true;
  const sinceCheck = nowMs - state.lastCheckMs;
  if (state.miss < maxBurst(group)) {
    return sinceCheck >= 2 * 60000;
  }
  if (state.miss < maxBurst(group) + MAX_CATCH_UP_EXTRA) {
    return sinceCheck >= CATCH_UP_MIN * 60000;
  }
  return false;
}

export function nextStateOnResult(prev: GraphState, nowMs: number, changed: boolean, newSnapshotMs: number | null): GraphState {
  const snapshotMoved = newSnapshotMs != null && prev.lastSnapshotMs != null && newSnapshotMs !== prev.lastSnapshotMs;
  if (changed || snapshotMoved) {
    return { stationId: prev.stationId, lastSnapshotMs: newSnapshotMs ?? prev.lastSnapshotMs, lastCheckMs: nowMs, lastChangeMs: changed ? nowMs : prev.lastChangeMs, miss: 0 };
  }
  return { stationId: prev.stationId, lastSnapshotMs: newSnapshotMs ?? prev.lastSnapshotMs, lastCheckMs: nowMs, lastChangeMs: prev.lastChangeMs, miss: prev.miss + 1 };
}
