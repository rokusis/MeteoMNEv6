// Jedan pogled na zdravlje svih izvora. Samo cita postojece tragove,
// ne dodaje poslove. Pragovi iz izmerenih ritmova (vidi DECISIONS).
export interface SourceHealth {
  source: string;
  state: 'ok' | 'stale' | 'unknown';
  checkedAgeMin: number | null;
  changedAgeMin: number | null;
  detail: string;
}

const MIN = 60000;

async function sourceStatusAge(db: D1Database, source: string, nowMs: number): Promise<number | null> {
  try {
    const r = (await db.prepare(`SELECT last_success_at FROM source_status WHERE source=?`).bind(source).first()) as any;
    if (!r?.last_success_at) return null;
    return Math.max(0, Math.round((nowMs - Date.parse(r.last_success_at)) / MIN));
  } catch {
    return null;
  }
}

async function logAges(
  db: D1Database,
  table: string,
  nowMs: number,
): Promise<{ checked: number | null; changed: number | null }> {
  try {
    const rows = (await db.prepare(`SELECT checked_at, status FROM ${table} ORDER BY checked_at DESC LIMIT 200`).all()) as any;
    const list = (rows?.results ?? []) as any[];
    if (!list.length) return { checked: null, changed: null };
    const checked = Math.max(0, Math.round((nowMs - Date.parse(list[0].checked_at)) / MIN));
    const ch = list.find((x: any) => x.status === 'changed' || x.status === 'first');
    const changed = ch ? Math.max(0, Math.round((nowMs - Date.parse(ch.checked_at)) / MIN)) : null;
    return { checked, changed };
  } catch {
    return { checked: null, changed: null };
  }
}

function stateOf(age: number | null, limitMin: number): 'ok' | 'stale' | 'unknown' {
  if (age == null || !Number.isFinite(age)) return 'unknown';
  return age <= limitMin ? 'ok' : 'stale';
}

export async function checkHealth(db: D1Database, nowMs: number = Date.now()): Promise<{ status: string; sources: SourceHealth[] }> {
  const out: SourceHealth[] = [];

  const aws = await sourceStatusAge(db, 'aws', nowMs);
  out.push({ source: 'aws-bulk', state: stateOf(aws, 10), checkedAgeMin: aws, changedAgeMin: aws, detail: 'T/kisa/vetar svaki minut' });

  const graph = await sourceStatusAge(db, 'graph', nowMs);
  out.push({ source: 'graph-hpr', state: stateOf(graph, 10), checkedAgeMin: graph, changedAgeMin: graph, detail: 'vlaga/pritisak/sunce na dogadjaj' });

  let synopAge: number | null = null;
  let synopMeta = '';
  try {
    const r = (await db.prepare(`SELECT meta_hour, meta_day, fetched_at FROM synop_cache WHERE id=1`).first()) as any;
    if (r?.fetched_at) {
      synopAge = Math.max(0, Math.round((nowMs - Date.parse(r.fetched_at)) / MIN));
      synopMeta = `termin ${r.meta_hour ?? '?'}h ${r.meta_day ?? ''}`.trim();
    }
  } catch {}
  out.push({ source: 'synop', state: stateOf(synopAge, 14 * 60), checkedAgeMin: synopAge, changedAgeMin: synopAge, detail: synopMeta || 'nema termina' });

  const off = await logAges(db, 'official_log', nowMs);
  out.push({
    source: 'official',
    state: stateOf(off.checked, 30),
    checkedAgeMin: off.checked,
    changedAgeMin: off.changed,
    detail: off.changed == null ? 'nema promene jos' : `zadnja promena pre ${off.changed} min`,
  });

  const hyd = await logAges(db, 'hydro_log', nowMs);
  out.push({
    source: 'hydro',
    state: stateOf(hyd.checked, 30),
    checkedAgeMin: hyd.checked,
    changedAgeMin: hyd.changed,
    detail: hyd.changed == null ? 'nema promene jos' : `zadnja promena pre ${hyd.changed} min`,
  });

  const sea = await logAges(db, 'sea_snow_log', nowMs);
  out.push({
    source: 'sea-snow',
    state: stateOf(sea.checked, 30),
    checkedAgeMin: sea.checked,
    changedAgeMin: sea.changed,
    detail: sea.changed == null ? 'nema promene jos' : `zadnja promena pre ${sea.changed} min`,
  });

  let numDetail = 'nema tura jos';
  let numState: 'ok' | 'stale' | 'unknown' = 'unknown';
  let numAge: number | null = null;
  try {
    const r = (await db.prepare(`SELECT model, status, updated_at FROM numerical_refresh`).all()) as any;
    const rows = (r?.results ?? []) as any[];
    if (rows.length) {
      const ages = rows.map((x: any) => Math.max(0, Math.round((nowMs - Date.parse(x.updated_at)) / MIN)));
      numAge = Math.max(...ages);
      const stuck = rows.filter((x: any) => x.status === 'pending' && Math.max(0, Math.round((nowMs - Date.parse(x.updated_at)) / MIN)) > 60);
      numState = stuck.length ? 'stale' : 'ok';
      numDetail = rows.map((x: any) => `${x.model}:${x.status}`).join(', ');
    }
  } catch {}
  out.push({ source: 'numerical', state: numState, checkedAgeMin: numAge, changedAgeMin: numAge, detail: numDetail });

  const status = out.every((s) => s.state === 'ok') ? 'ok' : out.some((s) => s.state === 'stale') ? 'degraded' : 'unknown';
  return { status, sources: out };
}
