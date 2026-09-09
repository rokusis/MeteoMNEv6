import { describe, it, expect } from 'vitest';
import { graphLagMin, GRAPH_LAG_LIMIT_MIN } from '../src/jobs/graphRefresh';

const MIN = 60000;

describe('merac kasnjenja repa', () => {
  it('granica je 3 minuta po pravilu svezine', () => {
    expect(GRAPH_LAG_LIMIT_MIN).toBe(3);
  });
  it('kasnjenje je sada minus snimak, na 1 decimalu', () => {
    const snap = Date.UTC(2026, 8, 9, 12, 0);
    expect(graphLagMin(snap + 5 * MIN + 30000, snap)).toBe(5.5);
    expect(graphLagMin(snap, snap)).toBe(0);
  });
  it('bez snimka nema merenja', () => {
    expect(graphLagMin(Date.now(), null)).toBe(null);
  });
});
