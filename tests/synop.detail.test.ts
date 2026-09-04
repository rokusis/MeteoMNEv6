import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';
const AWS_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","04.09.2026 19:20","31.4","0.0","1.4","6",""]]};
`;
const SYNOP_JS = `var sinopCGHour=19; var sinopCGDay="2026/09/04"; var sinop=[{ sifra: '13463', naziv: 'Podgorica', sat: '19', obl: '3', VBNobl: '9' }];`;
function mockDb() {
  const vals: Record<string, any> = { H: { ts: 111, value: 31 }, P: { ts: 111, value: 1009 }, GR: { ts: 111, value: 200 } };
  return {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        all: async () => {
          if (String(sql).includes('station_timeseries')) {
            const param = args[1];
            const v = vals[param];
            return { results: v ? [v] : [] };
          }
          return { results: [] };
        },
        first: async () => null,
        run: async () => {},
      }),
    }),
  } as any;
}
describe('detail jedne stanice', () => {
  it('vrati T + nebo + H/P/GR', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const u = String(url);
      if (u.includes('synopT.php')) return new Response(SYNOP_JS, { status: 200 }) as any;
      return new Response(AWS_HTML, { status: 200 }) as any;
    });
    const res = await worker.fetch(new Request('http://test/api/stations/02PDGR10'), { DB: mockDb() } as any);
    const data: any = await res.json();
    expect(data.status).toBe('ok');
    expect(data.station.temperatureC).toBe(31.4);
    expect(data.station.synopText).toBe('Pretežno vedro');
    expect(data.station.humidityPct).toBe(31);
    expect(data.station.pressureHpa).toBe(1009);
    expect(data.station.insolationWm2).toBe(200);
  });
});
