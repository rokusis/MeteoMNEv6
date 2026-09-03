import { getObservations, getCache } from './sources/zhms-aws/live';
import { calcExtremes } from './lib/extremes';
export interface Env { DB?: D1Database; APP_NAME?: string; }
const PAGE = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MeteoMNE</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f6f8fb;color:#0f172a}header{background:#0ea5e9;color:white;padding:16px 20px;position:sticky;top:0}h1{margin:0;font-size:20px}main{max-width:1000px;margin:0 auto;padding:16px}section{background:white;border-radius:12px;padding:14px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.06)}h2{margin:0 0 8px;font-size:16px}small{color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.card{border:1px solid #e2e8f0;border-radius:10px;padding:10px}.pill{display:inline-block;font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px;margin-top:6px}.extremes{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.ext{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff}.ext b{font-size:18px}#q{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin:8px 0}</style></head><body><header><h1>MeteoMNE — uživo sa meteo.co.me</h1><small id="status">učitavanje...</small></header><main><section><h2>Aktuelni min/max <small>(u zadnjih 1 sat, vrijeme diskretno)</small></h2><div id="extremes" class="extremes">učitavanje...</div></section><section><h2>Sve stanice <small id="count"></small></h2><input id="q" placeholder="traži: Podgorica, Bar, Žabljak..."><div id="list" class="grid">učitavanje...</div></section><section><h2>Grafik temperature <small id="gtitle">(klikni stanicu)</small></h2><div style="margin:6px 0"><small>Grupa:</small> <button onclick="setGroup('TH')">T+H</button> <button onclick="setGroup('RR')">Kiša</button> <button onclick="setGroup('BRV')">Vjetar</button> <button onclick="setGroup('P')">Pritisak</button> <button onclick="setGroup('GR')">Insolacija</button> <span style="margin-left:12px"><small>Raspon:</small> <button onclick="setRange(24)">24h</button> <button onclick="setRange(48)">48h</button> <button onclick="setRange(500)">Sve</button></span> <small id="ginfo"></small></div><canvas id="chart" width="800" height="200" style="width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;cursor:crosshair;"></canvas><small id="gtip" style="display:block;height:14px;color:#0369a1;"></small></section><section><h2>Zvanična prognoza <small id="offStatus"></small></h2><div id="offList"><small>učitavanje...</small></div></section><section><h2>Hidrologija <small id="hydroStatus"></small></h2><div id="hydroList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px"><small>učitavanje...</small></div></section><section><h2>More i snijeg <small id="seaSnowStatus"></small></h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><h3 style="margin:0 0 6px;font-size:14px">More</h3><div id="seaList"><small>učitavanje...</small></div></div><div><h3 style="margin:0 0 6px;font-size:14px">Snijeg</h3><div id="snowList"><small>učitavanje...</small></div></div></div></section></main><script>
async function j(u){const r=await fetch(u);return r.json()}
function card(s){const t=s.temperatureC!=null?s.temperatureC.toFixed(1)+'°C':'—';const w=s.windSpeedMs!=null?s.windSpeedMs+' m/s'+(s.windCompass?' '+s.windCompass:''):'—';const p=s.precipitationMm!=null?s.precipitationMm+' mm':'—';return '<div class=card><b>'+s.stationName+'</b><br><b style="font-size:20px">'+t+'</b><br><small>'+s.measuredAtRaw+'</small><br><small>vjetar: '+w+'<br>kiša: '+p+'</small><div class=pill>'+s.stationId+'</div></div>';}
function extCard(title, arr){
  if(!arr || !arr.length) return '<div class=ext><small>'+title+'</small><br>—<br><small>nema kandidata</small></div>';
  const getVal=(s)=> title.includes('toplije')||title.includes('hladnije') ? (s.temperatureC!=null?s.temperatureC.toFixed(1)+'°C':'—') : title.includes('vjetar') ? (s.windSpeedMs!=null?s.windSpeedMs+' m/s':'—') : (s.precipitationMm!=null?s.precipitationMm+' mm':'—');
  const allSame=arr.length>1 && arr.every(s=> getVal(s)===getVal(arr[0]));
  const many=arr.length>6;
  if(allSame && arr.length>10){
    const v=getVal(arr[0]);
    const msg=v==='0 mm' ? 'Nema padavina na svih '+arr.length+' stanica' : v==='0 m/s' ? 'Tišina (0 m/s) na svih '+arr.length+' stanica' : 'Sve '+arr.length+' stanica: '+v;
    const first3=arr.slice(0,3).map(s=> s.stationName).join(', ');
    return '<div class=ext><small>'+title+'</small><br><b>'+msg+'</b><br><small>'+first3+' i još '+(arr.length-3)+'</small><br><small>mjereno u '+arr[0].measuredAtRaw+'</small></div>';
  }
  const rows=arr.slice(0,6).map(s=> '<div style="margin:4px 0"><b>'+s.stationName+' '+getVal(s)+'</b><br><small>mjereno u '+s.measuredAtRaw+'</small> <small>'+s.stationId+'</small></div>').join('');
  const more=arr.length>6 ? '<small>... i još '+(arr.length-6)+' stanica</small>' : '';
  return '<div class=ext><small>'+title+'</small><br>'+rows+more+'</div>';
}
async function load(){
  try{
    const [st, ex]=await Promise.all([j('/api/stations'), j('/api/stations/extremes')]);
    document.getElementById('status').textContent='stanica: '+st.count+' • izvor: meteo.co.me • '+ new Date().toLocaleString();
    document.getElementById('count').textContent='('+st.count+')';
    const all=st.stations;
    const qEl=document.getElementById('q');
    function render(){ const q=qEl.value.toLowerCase(); const f=q ? all.filter(s=> (s.stationName+' '+s.stationId).toLowerCase().includes(q)) : all; document.getElementById('list').innerHTML=f.map(card).join('') || '<small>nema rezultata</small>'; }
    qEl.addEventListener('input', render); render();
    document.getElementById('extremes').innerHTML= extCard('najtoplije', ex.hottest)+extCard('najhladnije', ex.coldest)+extCard('najjači vjetar', ex.strongestWind)+extCard('najslabiji vjetar', ex.weakestWind)+extCard('najviše kiše', ex.mostPrecipitation)+extCard('najmanje kiše', ex.leastPrecipitation)+'<div class=ext><small>referentno vrijeme</small><br><b>'+(ex.referenceTimeRaw||ex.referenceTime||'—')+'</b><br><small>eligible: '+ex.eligibleCount+'</small></div>';
    // grafik
    const canvas=document.getElementById('chart'); const ctx=canvas.getContext('2d'); let curId=null; let curRange=24; let curGroup='TH';
    window.setRange=(n)=>{ curRange=n; if(curId) draw(curId, curGroup); };
    window.setGroup=(g)=>{ curGroup=g; if(curId) draw(curId, curGroup); };
    async function draw(gid, group){
      let gname=group;
      if(typeof group==='string' && group.includes('—')){ gname=group; group=curGroup; } else if(typeof group==='string' && !['TH','RR','BRV','P','GR'].includes(group)){ gname=group; group=curGroup; }
      curId=gid;
      const titleMap={TH:'T+H',RR:'Kiša',BRV:'Vjetar',P:'Pritisak',GR:'Insolacija'};
      document.getElementById('gtitle').textContent='— '+gname+' ('+(titleMap[group]||group)+')';
      let params=[], labels=[];
      if(group==='TH'){ params=['T','H']; labels=['T (°C)','H (%)']; }
      else if(group==='RR'){ params=['RR']; labels=['Kiša (mm)']; }
      else if(group==='BRV'){ params=['BRV']; labels=['Vjetar (m/s)']; }
      else if(group==='P'){ params=['P']; labels=['Pritisak (hPa)']; }
      else if(group==='GR'){ params=['GR']; labels=['Insolacija (W/m2)']; }
      else { params=['T']; labels=['T (°C)']; }
      const allData=[];
      for(let i=0;i<params.length;i++){
        const d=await j('/api/stations/'+gid+'/timeseries?param='+params[i]+'&limit='+curRange);
        allData.push({param:params[i], label:labels[i], points:d.points||[]});
      }
      const pts=allData[0]?.points||[];
      if(!pts.length){ document.getElementById('ginfo').textContent='nema podataka za '+labels.join(', '); ctx.clearRect(0,0,canvas.width,canvas.height); return; }
      document.getElementById('ginfo').textContent=allData.map(a=> a.label+': '+a.points.length).join(' | ')+' tačaka';
      let allVals=[]; allData.forEach(a=> a.points.forEach(p=>{if(p.value!=null) allVals.push(p.value)}));
      if(!allVals.length){ document.getElementById('ginfo').textContent='nema vrijednosti'; return; }
      const min=Math.min(...allVals), max=Math.max(...allVals);
      const W=canvas.width, H=canvas.height, pad=24;
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle='#e2e8f0'; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
      const colors=['#0ea5e9','#22c55e','#f97316','#8b5cf6','#eab308'];
      allData.forEach((a,ai)=>{
        const pts=a.points;
        ctx.strokeStyle=colors[ai%colors.length]; ctx.lineWidth=2; ctx.beginPath();
        pts.forEach((p,i)=>{
          const x=pad + (i/(pts.length-1||1))*(W-2*pad);
          const y=H-pad - ((p.value-min)/(max-min||1))*(H-2*pad);
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }); ctx.stroke();
      });
      const tip=document.getElementById('gtip');
      canvas.onmousemove=(e)=>{
        const rect=canvas.getBoundingClientRect(); const x=e.clientX-rect.left;
        const idx=Math.round((x-pad)/(canvas.width-2*pad)*((pts.length-1)||1));
        if(idx>=0&&idx<pts.length){
          const p=pts[idx];
          let txt=new Date(p.ts).toLocaleString()+' — ';
          txt+=allData.map(a=> a.label+': '+(a.points[idx]?.value!=null?a.points[idx].value:'—')).join(' | ');
          tip.textContent=txt;
        }
      };
      canvas.onmouseleave=()=> tip.textContent='';
    }
    document.getElementById('list').addEventListener('click', (e)=>{
      const card=e.target.closest('.card');
      if(!card) return;
      const id=card.querySelector('.pill')?.textContent;
      const name=card.querySelector('b')?.textContent;
      if(id) draw(id, name);
    });
    setTimeout(()=>{ const first=document.querySelector('.card .pill'); if(first){ const c=first.closest('.card'); const id=first.textContent; const nm=c.querySelector('b').textContent; draw(id,nm); } }, 1000);
    // zvanicna prognoza
    (async()=>{
      try{
        const o=await j('/api/forecast/official');
        document.getElementById('offStatus').textContent='• ažurirano: '+(o.issuedAt||'—');
        const days=o.days||[];
        const sea=o.seafarer;
        let html='';
        days.forEach(d=>{
          html+='<div class=card><b>'+d.title+'</b><br><small>'+(d.issuedAt||'')+'</small><br><p style="margin:6px 0">'+d.text.slice(0,400)+'</p>'+(d.image?'<img src="'+d.image+'" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px;" onerror="this.style.display='none'">':'')+'</div>';
        });
        if(sea){
          html+='<div class=card style="background:#f0f9ff"><b>'+sea.title+'</b><br><small>'+(sea.issuedAt||'')+'</small><br><p style="margin:6px 0">'+sea.text.slice(0,500)+'</p>'+(sea.image?'<img src="'+sea.image+'" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:8px;" onerror="this.style.display='none'">':'')+'</div>';
        }
        document.getElementById('offList').innerHTML = html || '<small>nema prognoze</small>';
      }catch(e){ document.getElementById('offStatus').textContent='greška: '+e; }
    })();
    // hidrologija
    (async()=>{
      try{
        const h=await j('/api/hydro');
        document.getElementById('hydroStatus').textContent='• stanica: '+h.countStations+' • mjerenja: '+h.countObs;
        const list=h.observations||[];
        const stationMap=new Map((h.stations||[]).map(s=>[s.id, s]));
        document.getElementById('hydroList').innerHTML = list.length ? list.map(o=>{
          const st=stationMap.get(o.stationId);
          const river=st?.river ? ' — '+st.river : '';
          return '<div class=card><b>'+o.name+river+'</b><br>vodostaj: '+(o.waterLevelCm!=null?o.waterLevelCm+' cm':'—')+'<br>temp vode: '+(o.waterTempC!=null?o.waterTempC+'°C':'—')+'<br><small>'+(o.measuredAtRaw||'')+' • '+o.stationId+(river?' • '+st.river:'')+'</small></div>';
        }).join('') : '<small>nema hidro mjerenja</small>';
      }catch(e){ document.getElementById('hydroStatus').textContent='greška: '+e; }
    })();
    // more i snijeg
    (async()=>{
      try{
        const [seaJ, snowJ]=await Promise.all([j('/api/sea'), j('/api/snow')]);
        document.getElementById('seaSnowStatus').textContent='• more: '+seaJ.count+' • snijeg: '+snowJ.count;
        document.getElementById('seaList').innerHTML = seaJ.sea && seaJ.sea.length ? seaJ.sea.map(s=> '<div class=card><b>'+s.place+'</b><br>'+(s.tempC!=null?s.tempC+'°C':'—')+'<br><small>'+(s.timeRaw||'')+'</small></div>').join('') : '<small>nema mjerenja mora</small>';
        document.getElementById('snowList').innerHTML = snowJ.snow && snowJ.snow.length ? snowJ.snow.map(s=> '<div class=card><b>'+s.place+'</b><br>'+(s.heightCm!=null?s.heightCm+' cm':'—')+'<br><small>'+(s.timeRaw||'')+'</small></div>').join('') : '<small>trenutno nema snijega (ljeto)</small>';
      }catch(e){ document.getElementById('seaSnowStatus').textContent='greška: '+e; }
    })();
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
      if (url.pathname.match(/\/api\/stations\/[^\/]+\/timeseries/)) {
        const parts=url.pathname.split('/'); const id=parts[3];
        const par=url.searchParams.get('param')||'T'; const lim=parseInt(url.searchParams.get('limit')||'48',10);
        try{
          const { loadTimeseries }=await import('./lib/timeseriesDb');
          const data=env.DB? await loadTimeseries(env.DB as any, id, par, lim) : [];
          if(!data.length){
            const tip = ['T','H','RR'].includes(par)?'G1':['BRV','PRV','MUV'].includes(par)?'G2':'G3';
            const { fetchGraph }=await import('./sources/zhms-aws/fetchGraph');
            const { parseDataAll }=await import('./sources/zhms-aws/parseGraph');
            const html=await fetchGraph(tip as any, id);
            const all=parseDataAll(html);
            const pts=(all as any)[par]||[];
            if(env.DB && pts.length) { const { saveTimeseries }=await import('./lib/timeseriesDb'); await saveTimeseries(env.DB as any, id, par, pts); }
            return Response.json({ status:'ok', source:'live', param:par, count: pts.length, points: pts.slice(-lim) });
          }
          return Response.json({ status:'ok', source:'db', param:par, count:data.length, points:data });
        }catch(e:any){ return Response.json({status:'error', message:String(e?.message??e)}, {status:500}); }
      }
      if (url.pathname === '/api/sea') {
        try { const { getSeaSnow }=await import('./sources/zhms-sea-snow/liveSeaSnow'); const r=await getSeaSnow(); return Response.json({ status:'ok', fromCache:r.fromCache, fetchedAt:r.fetchedAt, count:r.sea.length, sea:r.sea }); } catch(e:any){ return Response.json({status:'error', message:String(e?.message??e)}, {status:500}); }
      }
      if (url.pathname === '/api/snow') {
        try { const { getSeaSnow }=await import('./sources/zhms-sea-snow/liveSeaSnow'); const r=await getSeaSnow(); return Response.json({ status:'ok', fromCache:r.fromCache, fetchedAt:r.fetchedAt, count:r.snow.length, snow:r.snow }); } catch(e:any){ return Response.json({status:'error', message:String(e?.message??e)}, {status:500}); }
      }
      if (url.pathname === '/api/hydro') {
        try { const { getHydro }=await import('./sources/hydro/liveHydro'); const r=await getHydro(); return Response.json({ status:'ok', fromCache:r.fromCache, fetchedAt:r.fetchedAt, countStations:r.stations.length, countObs:r.observations.length, stations:r.stations, observations:r.observations }); } catch(e:any){ return Response.json({status:'error', message:String(e?.message??e)}, {status:500}); }
      }
      if (url.pathname === '/api/forecast/official') {
        try { const { getOfficial }=await import('./sources/zhms-official-forecast/liveOfficial'); const r=await getOfficial(); return Response.json({ status:'ok', ...r }); } catch(e:any){ return Response.json({status:'error', message:String(e?.message??e)}, {status:500}); }
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
