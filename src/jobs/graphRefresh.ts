import { isDue, nextStateOnResult, parseSnapshotMs, type GraphState } from '../sources/zhms-aws/graphSchedule';
import { fetchGraph } from '../sources/zhms-aws/fetchGraph';
import { parseDataAll } from '../sources/zhms-aws/parseGraph';
import { saveTimeseriesBatch } from '../lib/timeseriesDb';
import { saveSourceStatus } from '../db';

// Gomila u :00 je 37 stanica odjednom (27 satnih + 9 brzih + Kotor).
// 10 po krugu zbog CPU limita (mejl 1000+ prekrsaja); rep je ~5 min.
// Validirano simulacijom: nema gladovanja, nula promasaja.
export const GRAPH_REFRESH_LIMIT = 10;
// Vremenski budzet kruga: stanemo na vreme, ostatak ide sledeci minut.
// Bez ovoga prvo punjenje (cela istorija odjednom) ubije krug timeout-om.
const TICK_BUDGET_MS = 20000;
// Kap istorije po parametru: pokriva najveci raspon UI-ja, sece ponavljanje
// cele istorije pri prvom punjenju.
const MAX_POINTS_PER_PARAM = 500;

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
        // nov snimak: sveza sansa, parkira se ukida
        return { ...saved, lastSnapshotMs: snapMs, miss: 0 };
      }
      return saved;
    }
    return {
      stationId: s.stationId,
      lastSnapshotMs: parseSnapshotMs(s.measuredAtRaw),
      lastCheckMs: null,
      lastChangeMs: null,
      miss: 0,
      doneMs: null,
    };
  });
  const due = candidates.filter((c) => isDue(c, nowMs));
  const overdue = (c: GraphState) => (c.lastSnapshotMs == null ? Number.MAX_SAFE_INTEGER : nowMs - c.lastSnapshotMs);
  const isFresh = (c: GraphState) => {
    const saved = states.get(c.stationId);
    if (!saved || saved.lastCheckMs == null) return true;
    const snapMs = parseSnapshotMs(snapshots.find((s) => s.stationId === c.stationId)?.measuredAtRaw ?? null);
    return snapMs != null && saved.lastSnapshotMs != null && snapMs !== saved.lastSnapshotMs;
  };
  // sveze (pomeren snimak) pre ponavljanja, pa najstariji nepokriveni snimak
  due.sort((a, b) => Number(isFresh(b)) - Number(isFresh(a)) || overdue(b) - overdue(a));
  return due.slice(0, limit);
}

async function loadSnapshots(db: D1Database): Promise<Snapshot[]> {
  const { results } = await db.prepare(`SELECT station_id, measured_at_raw FROM observations`).all();
  return (results as any[]).map((r) => ({ stationId: r.station_id, measuredAtRaw: r.measured_at_raw ?? null }));
}

async function loadStates(db: D1Database): Promise<Map<string, GraphState>> {
  const m = new Map<string, GraphState>();
  try {
    const { results } = await db.prepare(`SELECT station_id, last_snapshot_ms, last_check_ms, last_change_ms, miss, done_ms FROM graph_state`).all();
    for (const r of results as any[]) {
      m.set(r.station_id, {
        stationId: r.station_id,
        lastSnapshotMs: r.last_snapshot_ms ?? null,
        lastCheckMs: r.last_check_ms ?? null,
        lastChangeMs: r.last_change_ms ?? null,
        miss: r.miss ?? 0,
        doneMs: r.done_ms ?? null,
      });
    }
  } catch {
    // tabela jos ne postoji (migracija nije primenjena): prazno stanje
  }
  return m;
}

async function saveState(db: D1Database, s: GraphState): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO graph_state (station_id, last_snapshot_ms, last_check_ms, last_change_ms, miss, done_ms, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id) DO UPDATE SET last_snapshot_ms=excluded.last_snapshot_ms, last_check_ms=excluded.last_check_ms, last_change_ms=excluded.last_change_ms, miss=excluded.miss, done_ms=excluded.done_ms, updated_at=excluded.updated_at`,
    ).bind(s.stationId, s.lastSnapshotMs, s.lastCheckMs, s.lastChangeMs, s.miss, s.doneMs, new Date().toISOString()).run();
  } catch {}
}

export async function refreshDueGraphs(db: D1Database, nowMs: number = Date.now(), limit: number = GRAPH_REFRESH_LIMIT): Promise<{ checked: number; updated: number; dueIds: string[] }> {
  const t0 = Date.now();
  const snapshots = await loadSnapshots(db);
  const states = await loadStates(db);
  const due = selectDueStations(snapshots, states, nowMs, limit);
  let updated = 0;
  let processed = 0;
  try {
    for (const d of due) {
      if (Date.now() - t0 > TICK_BUDGET_MS) break; // dosta za ovaj krug, ostatak sledeci minut
      try {
        const [g1, g3] = await Promise.all([fetchGraph('G1', d.stationId), fetchGraph('G3', d.stationId)]);
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
        const snapMs = parseSnapshotMs(snapshots.find((s) => s.stationId === d.stationId)?.measuredAtRaw ?? null);
        // pokriveno = podaci stigli do snimka (uz toleranciju); delmicni podaci se sacuvaju ali se snimak ne zatvara
        const changed = snapMs != null && latestNew >= snapMs - 5 * 60000;
        // upisuj samo nove tacke (max 500 najsvezijih): prvo punjenje ne sme da ubije krug
        const onlyNew = (pts: any[]) => {
          const cut = pts.length > MAX_POINTS_PER_PARAM ? pts.slice(-MAX_POINTS_PER_PARAM) : pts;
          return prevMax == null ? cut : cut.filter((p: any) => p.ts > (prevMax as number));
        };
      if (hPts.length) await saveTimeseriesBatch(db, d.stationId, 'H', onlyNew(hPts));
      if (pPts.length) await saveTimeseriesBatch(db, d.stationId, 'P', onlyNew(pPts));
      if (grPts.length) await saveTimeseriesBatch(db, d.stationId, 'GR', onlyNew(grPts));
        const nx = nextStateOnResult(d, nowMs, changed, snapMs ?? d.lastSnapshotMs);
        await saveState(db, nx);
        if (changed) updated++;
      } catch {
        const snapMs = parseSnapshotMs(snapshots.find((s) => s.stationId === d.stationId)?.measuredAtRaw ?? null);
        const nx = nextStateOnResult(d, nowMs, false, snapMs ?? d.lastSnapshotMs);
        await saveState(db, nx);
      }
      processed++;
    }
  } finally {
    // heartbeat: svaki krug ostavi trag kad je radio i koliko je pokrio
    try {
      await saveSourceStatus(db, 'graph', updated, null);
    } catch {}
  }
  return { checked: processed, updated, dueIds: due.slice(0, processed).map((d) => d.stationId) };
}
