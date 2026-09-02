import { describe, it, expect } from 'vitest';
import { windCodeToDegrees, windCodeToCompass } from '../src/sources/zhms-aws/wind';

describe('wind 0-32', () => {
  it('16 = 180 jug', () => {
    expect(windCodeToDegrees(16)).toBe(180);
    expect(windCodeToCompass(16)).toBe('S');
  });
  it('0 = 0 sjever', () => {
    expect(windCodeToDegrees(0)).toBe(0);
    expect(windCodeToCompass(0)).toBe('N');
  });
  it('8 = 90 istok', () => {
    expect(windCodeToDegrees(8)).toBe(90);
  });
  it('32 = 360 sjever opet', () => {
    expect(windCodeToDegrees(32)).toBe(360);
  });
  it('van 0-32 je undefined', () => {
    expect(windCodeToDegrees(33)).toBeUndefined();
    expect(windCodeToDegrees(-1)).toBeUndefined();
  });
});
