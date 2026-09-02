import { describe, it, expect } from 'vitest';
import { classifyBody, isValidAwsBody } from '../src/lib/classify';

describe('classifyBody', () => {
  it('prepoznaje no data', () => {
    expect(classifyBody('no data')).toBe('no_data');
    expect(classifyBody('  NO DATA  ')).toBe('no_data');
  });
  it('prepoznaje valid AWS', () => {
    expect(classifyBody('var posljednje = []; var stanice = [];')).toBe('valid');
    expect(isValidAwsBody('var posljednje = []; var stanice = [];')).toBe(true);
  });
  it('prepoznaje prazno', () => {
    expect(classifyBody('')).toBe('empty');
    expect(classifyBody('[]')).toBe('empty');
  });
  it('prepoznaje generic html', () => {
    expect(classifyBody('<html><body>hello</body></html>')).toBe('generic_html');
  });
  it('200 nije dovoljno - invalid ako nema var', () => {
    expect(classifyBody('{"ok":true}')).toBe('invalid');
  });
});
