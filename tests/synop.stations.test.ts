import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';
const AWS_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","04.09.2026 17:10","25.0","0.0","2.0","16",""]]};
`;
const SYNOP_JS = `var sinopCGHour=17; var sinopCGDay="2026/09/04"; var sinop=[{ sifra: '13463', naziv: 'Podgorica', sat: '17', obl: '5', VBNobl: '6' }];`;
describe('stations sa synop', () => {
  it('doda synopText bez diranja T', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const u = String(url);
      if (u.includes('synopT.php')) return new Response(SYNOP_JS, { status: 200 }) as any;
      return new Response(AWS_HTML, { status: 200 }) as any;
    });
    const res = await worker.fetch(new Request('http://test/api/stations'), {} as any);
    const data: any = await res.json();
    expect(data.status).toBe('ok');
    expect(data.stations[0].temperatureC).toBe(25);
    expect(data.stations[0].synopText).toBe('Umjereno oblačno');
  });
});
