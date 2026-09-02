import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';
const SAMPLE_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1],["02BAR010","13461",42.10563,19.08956,5.7,"Bar","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","02.09.2026 20:50","30.0","0.0","2.0","16",""],["02BAR010","glavna","Bar","02.09.2026 20:50","26.0","0.0","1.0","8",""]]};
`;
describe('extremes api', () => {
  it('vraca hottest i coldest', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SAMPLE_HTML, { status: 200 }) as any);
    const res = await worker.fetch(new Request('http://test/api/stations/extremes'), {} as any);
    const data: any = await res.json();
    expect(data.status).toBe('ok');
    expect(data.hottest[0].stationId).toBe('02PDGR10');
    expect(data.coldest[0].stationId).toBe('02BAR010');
    expect(data.hottest[0].measuredAtRaw).toBe('02.09.2026 20:50');
  });
});
