import { getObservations, getCache } from './sources/zhms-aws/live';
import { calcExtremes } from './lib/extremes';
export interface Env { DB?: D1Database; APP_NAME?: string; }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/status') {
        const c = getCache();
        let dbCount = 0;
        try { if (env.DB) { const r = await env.DB.prepare('SELECT COUNT(*) as c FROM observations').first() as any; dbCount = r?.c ?? 0; } } catch {}
        return Response.json({ status: 'ok', app: env.APP_NAME ?? 'MeteoMNEv6', time: new Date().toISOString(), memCache: c ? { count: c.observations.length, fetchedAt: c.fetchedAt } : null, dbCount });
      }
      if (url.pathname === '/api/stations/extremes') {
        const r = await getObservations(env.DB as any);
        const ex = calcExtremes(r.observations);
        if (ex.eligibleCount === 0) return Response.json({ status: 'unavailable', message: 'no eligible stations in last 1h', referenceTime: ex.referenceTime, eligibleCount: 0 });
        return Response.json({ status: 'ok', fromCache: r.fromCache, fetchedAt: r.fetchedAt, ...ex });
      }
      if (url.pathname === '/api/stations') {
        const r = await getObservations(env.DB as any);
        return Response.json({ status: 'ok', fromCache: r.fromCache, fetchedAt: r.fetchedAt, error: r.error ?? null, count: r.observations.length, stations: r.observations });
      }
      if (url.pathname.startsWith('/api/stations/')) {
        const id = url.pathname.split('/')[3];
        if (!id || id === 'extremes') return Response.json({ status: 'error', message: 'missing id' }, { status: 400 });
        const r = await getObservations(env.DB as any);
        const one = r.observations.find((o: any) => o.stationId === id);
        if (!one) return Response.json({ status: 'error', message: 'not found' }, { status: 404 });
        return Response.json({ status: 'ok', fromCache: r.fromCache, station: one });
      }
      return Response.json({ status: 'ok', message: 'MeteoMNEv6 radi', path: url.pathname });
    } catch (e: any) {
      return Response.json({ status: 'error', message: String(e?.message ?? e) }, { status: 503 });
    }
  },
};
