import { zhmsFetch } from '../../lib/http';
import { parseAir, type AirStation } from './parseAir';

const URL = 'https://www.epa.org.me/vazduh/';

// Jedan GET na glavnu stranu daje svih 10 stanica odjednom.
// Nema potrebe da se gadja svaka stanica posebno dok merimo ritam.
export async function fetchAirLive(): Promise<{ stations: AirStation[] }> {
  const res = await zhmsFetch(URL);
  if (!res.ok) throw new Error('air http ' + res.status);
  const html = await res.text();
  const stations = parseAir(html);
  return { stations };
}
