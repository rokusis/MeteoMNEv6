import { describe, it, expect } from 'vitest';
import { parseOfficial } from '../src/sources/zhms-official-forecast/parseOfficial';
const SAMPLE = `<html><body><div>Prognoza za 02.09.2026 14:00 Danas sunčano. Sjutra kiša. Pomorci: vjetar sjeverni 10 čvorova.</div></body></html>`;
describe('parseOfficial',()=>{
  it('cita dane i pomorce',()=>{
    const p=parseOfficial(SAMPLE);
    expect(p.days.length).toBeGreaterThan(0);
    expect(p.days[0].text.length).toBeGreaterThan(5);
  });
});
