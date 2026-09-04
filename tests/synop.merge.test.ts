import { describe, it, expect } from 'vitest';
import { attachSynopKind } from '../src/sources/zhms-synop/mergeWithAws';
const SYNOP = [
  { sifra: '13463', naziv: 'Podgorica', sat: '12', ww: undefined, obl: '2', VBNobl: '6' },
  { sifra: '13461', naziv: 'Bar', sat: '12', ww: undefined, obl: '2', VBNobl: '9' },
];
describe('spajanje AWS + SYNOP', () => {
  it('Podgorica se spaja po WMO, AWS T se ne dira', () => {
    const aws = { stationId: '02PDGR10', wmoId: '13463', stationName: 'Podgorica' };
    const r = attachSynopKind(aws, SYNOP as any);
    expect(r.synopStatus).toBe('OK');
    expect(r.synopText).toBe('Pretežno vedro');
    expect(r.aws.stationId).toBe('02PDGR10');
  });
  it('nepoznata stanica nema synop', () => {
    const r = attachSynopKind({ stationId: 'XX', wmoId: '99999', stationName: 'Nepoznata' }, SYNOP as any);
    expect(r.synopStatus).toBe('NONE');
  });
});
