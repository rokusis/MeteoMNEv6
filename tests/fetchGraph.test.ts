import { describe, it, expect, vi } from 'vitest';
import { buildGraphUrl, fetchGraph } from '../src/sources/zhms-aws/fetchGraph';

describe('fetchGraph', () => {
  it('pravi url za Podgoricu G1', () => {
    expect(buildGraphUrl('G1','02PDGR10')).toBe('https://www.meteo.co.me/Meteorologija/aws-graph.php?v=G1&s=02PDGR10');
  });
  it('baca za pogresan tip', () => {
    expect(()=> buildGraphUrl('G9' as any,'02PDGR10')).toThrow();
  });
  it('hvata DataAll', async () => {
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('var DataAll = [];', {status:200}) as any);
    const t = await fetchGraph('G1','02PDGR10');
    expect(t).toContain('DataAll');
  });
  it('baca za no data', async () => {
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('no data', {status:200}) as any);
    await expect(fetchGraph('G1','02PDGR10')).rejects.toThrow('no data');
  });
});
