import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getObservationsWithCache, setCacheForTest } from '../src/sources/zhms-aws/live';

const SAMPLE_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","31.08.2026 19:40","21.5","0.0","2.3","16","5.1"]]};
`;

describe('live with cache', () => {
  beforeEach(() => setCacheForTest(null as any));
  it('vrati podatke uzivo pa iz kesa kad padne', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(SAMPLE_HTML, { status: 200 }) as any);
    const r1 = await getObservationsWithCache();
    expect(r1.fromCache).toBe(false);
    expect(r1.observations[0].stationId).toBe('02PDGR10');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('no data', { status: 200 }) as any);
    const r2 = await getObservationsWithCache();
    expect(r2.fromCache).toBe(true);
    expect(r2.observations[0].stationId).toBe('02PDGR10');
  });
});
