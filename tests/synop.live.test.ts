import { describe, it, expect, vi } from 'vitest';
import { getSynop } from '../src/sources/zhms-synop/liveSynop';
const SAMPLE = `var sinopCGHour=12; var sinopCGDay="2026/09/04"; var sinop=[{ sifra: '13463', naziv: 'Podgorica', sat: '12', obl: '2', VBNobl: '6' }];`;
describe('synop live', () => {
  it('vraća stanice pa iz keša kad padne', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(SAMPLE, { status: 200 }) as any);
    const r1 = await getSynop();
    expect(r1.fromCache).toBe(false);
    expect(r1.stations[0].synopText).toBe('Pretežno vedro');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('no data', { status: 200 }) as any);
    const r2 = await getSynop();
    expect(r2.fromCache).toBe(true);
    expect(r2.stations[0].sifra).toBe('13463');
  });
});
