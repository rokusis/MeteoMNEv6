import { isDue, nextStateOnResult, parseSnapshotMs, type GraphState } from '../sources/zhms-aws/graphSchedule';
import { fetchGraph } from '../sources/zhms-aws/fetchGraph';
import { parseDataAll } from '../sources/zhms-aws/parseGraph';
import { saveTimeseries } from '../lib/timeseriesDb';

export const GRAPH_REFRESH_LIMIT = 8;

export interface Snapshot {
  stationId: string;
  measuredAtRaw: string | null;
}

export function selectDueStations(
  snapshots: Snapshot[],
  states: Map<string, GraphState>,
  nowMs: number,
  limit: number = GRAPH_REFRESH_LIMIT,
): GraphState[] {
  const candidates: GraphState[] = snapshots.map((s) => {
    const saved = states.get(s.stationId);
    if (saved) {
      const snapMs = parseSnapshotMs(s.measuredAtRaw);
      if (snapMs != null && saved.lastSnapshotMs != null && snapMs !== saved.lastSnapshotMs) {
        return { ...saved, lastSnapshotMs: snapMs };
      }
      return saved;
    }
    return {
      stationId: s.stationId,
      lastSnapshotMs: parseSnapshotMs(s.measuredAtRaw),
      lastCheckMs: null,
      lastChangeMs: null,
      miss: 0,
    };
  });
  const due = candidates.filter((c) => isDue(c, nowMs));
  due.sort((a, b) => (a.lastCheckMs ?? 0) - (b.lastCheckMs ?? 0));
  return due.slice(0, limit);
}

async function loadSnapshots(db: D1Database): Promise<Snapshot[]> {
  const { results } = await db.prepare(`SELECT station_id, measured_at_raw FROM observations`).all();
  return (results as any[]).map((r) => ({ stationId: r.station_id, measuredAtRaw: r.measured_at_raw ?? null }));
}

async function loadStates(db: D1Database): Promise<Map<string, GraphState>> {
  const m = new Map<string, GraphState>();
  try {
    const { results } = await db.prepare(`SELECT station_id, last_snapshot_ms, last_check_ms, last_change_ms, miss FROM graph_state`).all();
    for (const r of results as any[]) {
      m.set(r.station_id, {
        stationId: r.station_id,
        lastSnapshotMs: r.last_snapshot_ms ?? null,
        lastCheckMs: r.last_check_ms ?? null,
        lastChangeMs: r.last_change_ms ?? null,
        miss: r.miss ?? 0,
      });
    }
  } catch {}
  return m;
}

async function saveState(db: D1Database, s: GraphState): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO graph_state (station_id, last_snapshot_ms, last_check_ms, last_change_ms, miss, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id) DO UPDATE SET last_snapshot_ms=excluded.last_snapshot_ms, last_check_ms=excluded.last_check_ms, last_change_ms=excluded.last_change_ms, miss=excluded.miss, updated_at=excluded.updated_at`,
    ).bind(s.stationId, s.lastSnapshotMs, s.lastCheckMs, s.lastChangeMs, s.miss, new Date().toISOString()).run();
  } catch {}
}

export async function refreshDueGraphs(db: D1Database, nowMs: number = Date.now(), limit: number = GRAPH_REFRESH_LIMIT): Promise<{ checked: number; updated: number; dueIds: string[] }> {
  const snapshots = await loadSnapshots(db);
  const states = await loadStates(db);
  const due = selectDueStations(snapshots, states, nowMs, limit);
  let updated = 0;
  for (const d of due) {
    try {
      const g1 = await fetchGraph('G1', d.stationId);
      const g3 = await fetchGraph('G3', d.stationId);
      const p1 = parseDataAll(g1);
      const p3 = parseDataAll(g3);
      const hPts = (p1 as any).H ?? [];
      const pPts = (p3 as any).P ?? [];
      const grPts = (p3 as any).GR ?? [];
      let prevMax: number | null = null;
      try {
        const r = await db.prepare(`SELECT MAX(ts) as m FROM station_timeseries WHERE station_id=? AND param IN ('H','P','GR')`).bind(d.stationId).first() as any;
        prevMax = r?.m ?? null;
      } catch {}
      const latestNew = Math.max(0, ...hPts.map((p: any) => p.ts), ...pPts.map((p: any) => p.ts), ...grPts.map((p: any) => p.ts));
      const changed = latestNew > 0 && (prevMax == null || latestNew > prevMax);
      if (hPts.length) await saveTimeseries(db, d.stationId, 'H', hPts);
      if (pPts.length) await saveTimeseries(db, d.stationId, 'P', pPts);
      if (grPts.length) await saveTimeseries(db, d.stationId, 'GR', grPts);
      const snapMs = parseSnapshotMs(snapshots.find((s) => s.stationId === d.stationId)?.measuredAtRaw ?? null);
      const nx = nextStateOnResult(d, nowMs, changed, snapMs ?? d.lastSnapshotMs);
      await saveState(db, nx);
      if (changed) updated++;
    } catch {
      const snapMs = parseSnapshotMs(snapshots.find((s) => s.stationId === d.stationId)?.measuredAtRaw ?? null);
      const nx = nextStateOnResult(d, nowMs, false, snapMs ?? d.lastSnapshotMs);
      await saveState(db, nx);
    }
  }
  return { checked: due.length, updated, dueIds: due.map((d) => d.stationId) };
}
