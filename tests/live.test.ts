import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getObservations } from '../src/sources/zhms-aws/live';
const SAMPLE_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","31.08.2026 19:40","21.5","0.0","2.3","16","5.1"]]};
`;
function mockDb() {
  const store: any = { st: [], obs: [] };
  return {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        run: async () => {},
        first: async () => ({ c: store.obs.length }),
        all: async () => ({ results: store.obs }),
      }),
      first: async () => ({ c: store.obs.length }),
      all: async () => ({ results: store.obs }),
      run: async () => {},
    }),
  } as any;
}
describe('live with cache', () => {
  it('vrati podatke uzivo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(SAMPLE_HTML, { status: 200 }) as any);
    const r1 = await getObservations(mockDb());
    expect(r1.fromCache).toBe(false);
    expect(r1.observations[0].stationId).toBe('02PDGR10');
  });
});
