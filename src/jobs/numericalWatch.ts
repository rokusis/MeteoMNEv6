import { podgoricaLocal } from '../sources/zhms-aws/graphSchedule';
import { zhmsFetch } from '../lib/http';
import { buildNumericalUrl } from '../sources/numerical/urls';
import { parseNumerical } from '../sources/numerical/parseNumerical';
import { NUMERICAL_STATIONS } from '../sources/numerical/stations';

export type NumModel = 'a3km' | 'e3km';

// Prozori iz merenja numerical_log (4 dana zaredom):
// e3km svako jutro ~09:30, a3km negde prepodne 06-13h.
export function numericalWatchModels(nowMs: number = Date.now()): NumModel[] {
  const { hour, minute } = podgoricaLocal(nowMs);
  const m = hour * 60 + minute;
  const out: NumModel[] = [];
  if (m >= 540 && m < 630) out.push('e3km');
  if (m >= 360 && m < 780) out.push('a3km');
  return out;
}

function sentinelUrl(model: NumModel): string {
  const letter = model === 'a3km' ? 'A' : 'E';
  const folder = model === 'a3km' ? '5danaA' : '5danaE';
  return `https://www.meteo.co.me/Meteorologija/Pr/Gradovi/${folder}/POD-${letter}1.html`;
}

async function lastKnownModified(db: D1Database, model: NumModel): Promise<string | null> {
  try {
    const r = (await db.prepare(`SELECT last_modified FROM numerical_refresh WHERE model=?`).bind(model).first()) as any;
    if (r?.last_modified) return r.last_modified;
  } catch {}
  try {
    const r = (await db
      .prepare(`SELECT last_modified FROM numerical_log WHERE city='POD' AND model=? ORDER BY checked_at DESC LIMIT 1`)
      .bind(model)
      .first()) as any;
    return r?.last_modified ?? null;
  } catch {}
  return null;
}

// Jedna jeftina uslovna provera: da li je model objavio novo.
// Na 200 samo zabelezi promenu i resetuj kursor; povlacenje rade ture.
export async function checkModelSentinel(db: D1Database, model: NumModel): Promise<{ changed: boolean }> {
  const known = await lastKnownModified(db, model);
  const headers: Record<string, string> = {};
  if (known) headers['If-Modified-Since'] = known;
  const res = await zhmsFetch(sentinelUrl(model), { headers });
  if (res.status === 304) return { changed: false };
  const lm = res.headers.get('last-modified') || res.headers.get('Last-Modified') || null;
  if (res.status === 200 && lm && lm !== known) {
    const now = new Date().toISOString();
    try {
      await db
        .prepare(
          `INSERT INTO numerical_refresh (model, last_modified, cursor_idx, status, updated_at)
           VALUES (?, ?, 0, 'pending', ?)
           ON CONFLICT(model) DO UPDATE SET last_modified=excluded.last_modified, cursor_idx=0, status='pending', updated_at=excluded.updated_at`,
        )
        .bind(model, lm, now)
        .run();
    } catch {}
    return { changed: true };
  }
  return { changed: false };
}

export async function fetchCityModel(db: D1Database, model: NumModel, city: string): Promise<void> {
  for (let day = 1; day <= 5; day++) {
    const url = buildNumericalUrl(model as any, city as any, day);
    const res = await zhmsFetch(url);
    const html = await res.text();
    const p = parseNumerical(html, city, model);
    const now = new Date().toISOString();
    const r = (await db
      .prepare(
        `INSERT INTO numerical_days (city, model, day_num, date, tmin, tmax, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(city, model, day_num) DO UPDATE SET date=excluded.date, tmin=excluded.tmin, tmax=excluded.tmax, fetched_at=excluded.fetched_at RETURNING id`,
      )
      .bind(city, model, day, p.date || null, p.tmin ?? null, p.tmax ?? null, now)
      .first()) as any;
    const dayId =
      r?.id ??
      ((await db
        .prepare(`SELECT id FROM numerical_days WHERE city=? AND model=? AND day_num=?`)
        .bind(city, model, day)
        .first()) as any)?.id;
    if (!dayId) continue;
    await db.prepare(`DELETE FROM numerical_hours WHERE day_id=?`).bind(dayId).run();
    for (const h of p.hours) {
      await db
        .prepare(`INSERT INTO numerical_hours (day_id, utc_hour, symbol, rr_mm, rh_pct, wind_code) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(dayId, h.utcHour, h.symbol || null, h.rrMm ?? null, h.rhPct ?? null, h.windCode || null)
        .run();
    }
    await new Promise((r2) => setTimeout(r2, 80));
  }
}

const BATCH_CITIES = 3;
const BATCH_BUDGET_MS = 20000;

// Jedna tura: par gradova, pa stani. Kursor pamti dokle se stiglo,
// sledeci krug nastavlja - i posle timeout-a i posle deploy-a.
export async function runNumericalBatch(db: D1Database, model: NumModel, maxCities: number = BATCH_CITIES): Promise<{ done: boolean; cities: string[] }> {
  const t0 = Date.now();
  const cities = Object.keys(NUMERICAL_STATIONS);
  let cursor = 0;
  try {
    const row = (await db.prepare(`SELECT cursor_idx FROM numerical_refresh WHERE model=?`).bind(model).first()) as any;
    cursor = row?.cursor_idx ?? 0;
  } catch {}
  const done: string[] = [];
  let i = cursor;
  for (; i < cities.length && done.length < maxCities; i++) {
    if (Date.now() - t0 > BATCH_BUDGET_MS) break;
    try {
      await fetchCityModel(db, model, cities[i]);
      done.push(cities[i]);
    } catch {
      continue; // pokvaren grad ne sme da blokira rep; bice svez na sledecoj promeni
    }
  }
  const finished = i >= cities.length;
  try {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO numerical_refresh (model, last_modified, cursor_idx, status, updated_at)
         VALUES (?, (SELECT last_modified FROM numerical_refresh WHERE model=?), ?, ?, ?)
         ON CONFLICT(model) DO UPDATE SET cursor_idx=excluded.cursor_idx, status=excluded.status, updated_at=excluded.updated_at`,
      )
      .bind(model, model, i, finished ? 'done' : 'pending', now)
      .run();
  } catch {}
  return { done: finished, cities: done };
}

// Glavni ulaz za kron: straza u prozorima + nastavak zapocetog.
export async function runNumericalTick(db: D1Database, nowMs: number = Date.now()): Promise<void> {
  // Samo-pokretanje: prazna tabela znaci da nikad nismo vukli (npr. prvi
  // deploy usred dana) - upisi pending pa ture same nadoknade.
  for (const model of ['e3km', 'a3km'] as const) {
    try {
      const row = (await db.prepare(`SELECT model FROM numerical_refresh WHERE model=?`).bind(model).first()) as any;
      if (!row) {
        await db
          .prepare(`INSERT INTO numerical_refresh (model, last_modified, cursor_idx, status, updated_at) VALUES (?, ?, ?, ?, ?)`)
          .bind(model, null, 0, 'pending', new Date().toISOString())
          .run();
      }
    } catch {}
  }
  const batched = new Set<NumModel>();
  for (const model of numericalWatchModels(nowMs)) {
    try {
      const s = await checkModelSentinel(db, model);
      if (!s.changed) continue;
    } catch {
      continue;
    }
    try {
      await runNumericalBatch(db, model);
      batched.add(model);
    } catch {}
  }
  for (const model of ['e3km', 'a3km'] as const) {
    if (batched.has(model)) continue;
    try {
      const row = (await db.prepare(`SELECT status FROM numerical_refresh WHERE model=?`).bind(model).first()) as any;
      if (row?.status === 'pending') await runNumericalBatch(db, model);
    } catch {}
  }
}
