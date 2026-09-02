import { getObservations, getCache } from './sources/zhms-aws/live';
import { calcExtremes } from './lib/extremes';
export interface Env { DB?: D1Database; APP_NAME?: string; }
const PAGE = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MeteoMNE</title><style>body{font-family:system-ui, sans-serif; margin:0; background:#f6f8fb; color:#0f172a}header{background:#0ea5e9; color:white; padding:16px 20px; position:sticky; top:0}h1{margin:0; font-size:20px}main{max-width:1000px; margin:0 auto; padding:16px}section{background:white; border-radius:12px; padding:14px; margin:12px 0; box-shadow:0 2px 8px rgba(0,0,0,.06)}h2{margin:0 0 8px; font-size:16px}small{color:#64748b}.grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px}.card{border:1px solid #e2e8f0; border-radius:10px; padding:10px}.pill{display:inline-block; font-size:12px; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:999px; margin-top:6px}.extremes{display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px}.ext{border:1px solid #e2e8f0; border-radius:10px; padding:10px; background:#fff}.ext b{font-size:18px}#q{width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:8px 0}</style></head><body><header><h1>MeteoMNE — uživo sa meteo.co.me</h1><small id="status">učitavanje...</small></header><main><section><h2>Aktuelni min/max <small>(u zadnjih 1 sat, vrijeme diskretno)</small></h2><div id="extremes" class="extremes">učitavanje...</div></section><section><h2>Sve stanice <small id="count"></small></h2><input id="q" placeholder="traži: Podgorica, Bar, Žabljak..."><div id="list" class="grid">učitavanje...</div></section></main><script>
async function j(u){const r=await fetch(u);return r.json()}
function card(s){
  const t = s.temperatureC != null ? s.temperatureC.toFixed(1)+'°C' : '—';
  const w = s.windSpeedMs != null ? s.windSpeedMs+' m/s' + (s.windCompass? ' '+s.windCompass:'') : '—';
  const p = s.precipitationMm != null ? s.precipitationMm+' mm' : '—';
  return '<div class=card><b>'+s.stationName+'</b><br><b style="font-size:20px">'+t+'</b><br><small>'+s.measuredAtRaw+'</small><br><small>vjetar: '+w+'<br>kiša: '+p+'</small><div class=pill>'+s.stationId+'</div></div>';
}
function extCard(title, arr){
  if(!arr || !arr.length) return '<div class=ext><small>'+title+'</small><br>—<br><small>nema kandidata</small></div>';
  const getVal = (s) => title.includes('toplije')||title.includes('hladnije') ? (s.temperatureC!=null?s.temperatureC.toFixed(1)+'°C':'—') : title.includes('vjetar') ? (s.windSpeedMs!=null?s.windSpeedMs+' m/s':'—') : (s.precipitationMm!=null?s.precipitationMm+' mm':'—');
  const rows = arr.map(s=> '<div style="margin:4px 0"><b>'+s.stationName+' '+getVal(s)+'</b><br><small>mjereno u '+s.measuredAtRaw+'</small> <small>'+s.stationId+'</small></div>').join('');
  return '<div class=ext><small>'+title+'</small><br>'+rows+'</div>';
}
async function load(){
  try{
    const [st, ex] = await Promise.all([j('/api/stations'), j('/api/stations/extremes')]);
    document.getElementById('status').textContent = 'stanica: '+st.count+' • izvor: meteo.co.me • '+ new Date().toLocaleString();
    document.getElementById('count').textContent = '('+st.count+')';
    const all = st.stations;
    const qEl = document.getElementById('q');
    function render(){
      const q = qEl.value.toLowerCase();
      const f = q ? all.filter(s=> (s.stationName+' '+s.stationId).toLowerCase().includes(q)) : all;
      document.getElementById('list').innerHTML = f.map(card).join('') || '<small>nema rezultata</small>';
    }
    qEl.addEventListener('input', render);
    render();
    const e = ex;
    document.getElementById('extremes').innerHTML =
      extCard('najtoplije', e.hottest) +
      extCard('najhladnije', e.coldest) +
      extCard('najjači vjetar', e.strongestWind) +
      extCard('najslabiji vjetar', e.weakestWind) +
      extCard('najviše kiše', e.mostPrecipitation) +
      extCard('najmanje kiše', e.leastPrecipitation) +
      '<div class=ext><small>referentno vrijeme</small><br><b>'+ (e.referenceTime? new Date(e.referenceTime).toLocaleString() : '—') +'</b><br><small>eligible: '+e.eligibleCount+'</small></div>';
  }catch(e){ document.getElementById('status').textContent='greška: '+e; }
}
load();
<\/script></body></html>`;
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
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
      return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    } catch (e: any) {
      return Response.json({ status: 'error', message: String(e?.message ?? e) }, { status: 503 });
    }
  },
};
