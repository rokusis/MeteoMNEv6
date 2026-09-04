import { describe, it, expect } from 'vitest';
import { fullWeatherText } from '../src/sources/zhms-synop/weatherFull';
const SRC = `var opisiPojava=['nula','jedan','dva','tri','cetiri','pet']; var sinop=[{ sifra: '1', naziv: 'T', sat: '12', obl: '2', VBNobl: '6' }];`;
describe('pun tekst iz izvora', () => {
  it('oblacnost ide iz NEBO', () => {
    expect(fullWeatherText(SRC, undefined, '2', '6')).toBe('Pretežno vedro');
  });
  it('ww >= 4 ide iz opisiPojava', () => {
    expect(fullWeatherText(SRC, '5', '8', '6')).toBe('pet');
  });
});
