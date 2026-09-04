import { describe, it, expect } from 'vitest';
import { synopKind } from '../src/sources/zhms-synop/weatherKind';
describe('synop sličica + tekst', () => {
  it('Podgorica obl 2 -> Pretežno vedro', () => {
    const r = synopKind(undefined, '2', '6');
    expect(r.text).toBe('Pretežno vedro');
    expect(r.status).toBe('OK');
  });
  it('Bar obl 2 + VBNobl 9 -> Vedro', () => {
    const r = synopKind(undefined, '2', '9');
    expect(r.text).toBe('Vedro');
  });
  it('ww >= 4 je UNRESOLVED za sad', () => {
    const r = synopKind('20', '5', '6');
    expect(r.status).toBe('UNRESOLVED');
  });
});
