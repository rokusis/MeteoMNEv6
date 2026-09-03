import { zhmsFetch } from '../../lib/http';
import { parseOfficial } from './parseOfficial';
const URL = 'https://www.meteo.co.me/page.php?id=31';
let cache: any = null;
export async function fetchOfficialLive(): Promise<any> {
  const res = await zhmsFetch(URL);
  const html = await res.text();
  const parsed = parseOfficial(html);
  cache = { ...parsed, fetchedAt: new Date().toISOString() };
  return cache;
}
export async function getOfficial(): Promise<any> {
  try { return await fetchOfficialLive(); } catch(e){ if(cache) return {...cache, fromCache:true}; throw e; }
}
