export type StationGroup = 'fast' | 'kotor' | 'hourly';
export interface GraphState {
  stationId: string;
  lastSnapshotMs: number | null;
  lastCheckMs: number | null;
  lastChangeMs: number | null;
  miss: number;
  doneMs: number | null;
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

export function maxBurst(group: StationGroup): number {
  if (group === 'fast') return 5;
  return 4;
}

export const CATCH_UP_MIN = 6;
export const MAX_CATCH_UP_EXTRA = 6;

function lastSunday(year: number, monthIdx: number): number {
  const d = new Date(Date.UTC(year, monthIdx + 1, 0));
  const day = d.getUTCDay();
  return d.getUTCDate() - day;
}
function podgoricaOffsetHours(yyyy: number, mm: number, dd: number, hh: number, mi: number): number {
  const asUtc = Date.UTC(yyyy, mm - 1, dd, hh, mi);
  const dstStart = Date.UTC(yyyy, 2, lastSunday(yyyy, 2), 1, 0);
  const dstEnd = Date.UTC(yyyy, 9, lastSunday(yyyy, 9), 1, 0);
  return asUtc >= dstStart && asUtc < dstEnd ? 2 : 1;
}
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
  return Date.UTC(yyyy, mm - 1, dd, hh, mi) - podgoricaOffsetHours(yyyy, mm, dd, hh, mi) * 3600000;
}

export function retrySpacingMin(miss: number, group: StationGroup): number {
  return miss < maxBurst(group) ? 2 : CATCH_UP_MIN;
}
export function maxChecks(group: StationGroup): number {
  return maxBurst(group) + MAX_CATCH_UP_EXTRA;
}
export function isDue(state: GraphState, nowMs: number): boolean {
  // dogadjaj: bulk je video nov snimak koji grafik jos nije pokrio.
  // nema prozora: prozor bi sam garantovao lag, okidac je pomeren snimak.
  if (state.lastSnapshotMs == null) return true;
  if (state.doneMs != null && state.lastSnapshotMs <= state.doneMs) return false;
  if (nowMs - state.lastSnapshotMs < 90000) return false; // snimak tek stigao, grafik jos izlazi
  const group = groupFor(state.stationId);
  if (state.miss >= maxChecks(group)) return false; // parkiran do novog snimka
  if (state.lastCheckMs == null) return true;
  return nowMs - state.lastCheckMs >= retrySpacingMin(state.miss, group) * 60000;
}

export function nextStateOnResult(prev: GraphState, nowMs: number, changed: boolean, newSnapshotMs: number | null): GraphState {
  const snapshotMoved = newSnapshotMs != null && prev.lastSnapshotMs != null && newSnapshotMs !== prev.lastSnapshotMs;
  if (changed || snapshotMoved) {
    return { stationId: prev.stationId, lastSnapshotMs: newSnapshotMs ?? prev.lastSnapshotMs, lastCheckMs: nowMs, lastChangeMs: changed ? nowMs : prev.lastChangeMs, miss: 0, doneMs: changed ? (newSnapshotMs ?? prev.lastSnapshotMs) : prev.doneMs };
  }
  return { stationId: prev.stationId, lastSnapshotMs: newSnapshotMs ?? prev.lastSnapshotMs, lastCheckMs: nowMs, lastChangeMs: prev.lastChangeMs, miss: prev.miss + 1, doneMs: prev.doneMs };
}

// Lokalno vreme Podgorice (zimsko +1, letnje +2) za prozore straze.
export function podgoricaLocal(nowMs: number): { hour: number; minute: number } {
  const guess = new Date(nowMs + 2 * 3600000);
  const off = podgoricaOffsetHours(guess.getUTCFullYear(), guess.getUTCMonth() + 1, guess.getUTCDate(), guess.getUTCHours(), guess.getUTCMinutes());
  const l = new Date(nowMs + off * 3600000);
  return { hour: l.getUTCHours(), minute: l.getUTCMinutes() };
}
