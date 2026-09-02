import { getObservationsWithCache, getCache } from './sources/zhms-aws/live';

export interface Env { APP_NAME?: string; }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/status') {
        const c = getCache();
        return Response.json({ status: 'ok', app: env.APP_NAME ?? 'MeteoMNEv6', time: new Date().toISOString(), cache: c ? { count: c.observations.length, fetchedAt: c.fetchedAt } : null });
      }
      if (url.pathname === '/api/stations') {
        const r = await getObservationsWithCache();
        return Response.json({ status: 'ok', fromCache: r.fromCache, fetchedAt: r.fetchedAt, error: r.error ?? null, count: r.observations.length, stations: r.observations });
      }
      if (url.pathname.startsWith('/api/stations/')) {
        const id = url.pathname.split('/')[3];
        if (!id) return Response.json({ status: 'error', message: 'missing id' }, { status: 400 });
        const r = await getObservationsWithCache();
        const one = r.observations.find(o => o.stationId === id);
        if (!one) return Response.json({ status: 'error', message: 'not found' }, { status: 404 });
        return Response.json({ status: 'ok', fromCache: r.fromCache, station: one });
      }
      return Response.json({ status: 'ok', message: 'MeteoMNEv6 skeleton radi', path: url.pathname });
    } catch (e: any) {
      return Response.json({ status: 'error', message: String(e?.message ?? e) }, { status: 503 });
    }
  },
};
