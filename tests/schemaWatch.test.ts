import { describe, it, expect } from 'vitest';
import { blockShape, schemaFingerprint, checkSchema } from '../src/lib/schemaWatch';

const PAGE =
  `var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1],["02BAR010","13461",42.10563,19.08956,5.7,"Bar","glavna",1]];` +
  ` var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","02.09.2026 20:50","30.0","0.0","2.0","16",""],["02BAR010","glavna","Bar","02.09.2026 20:50","26.0","0.0","1.0","8",""]]};`;

function fakeDb() {
  const m = new Map<string, any>();
  return {
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (sql.startsWith('INSERT INTO schema_state')) m.set(a[0], { fingerprint: a[1], pending_fp: null, pending_hits: 0 });
          else if (sql.startsWith('UPDATE schema_state SET fingerprint=')) m.set(a[2], { fingerprint: a[0], pending_fp: null, pending_hits: 0 });
          else if (sql.startsWith('UPDATE schema_state SET pending_fp=NULL')) { const r = m.get(a[1]); if (r) { r.pending_fp = null; r.pending_hits = 0; } }
          else if (sql.startsWith('UPDATE schema_state SET pending_fp=')) { const r = m.get(a[3]); if (r) { r.pending_fp = a[0]; r.pending_hits = a[1]; } }
        },
        first: async () => m.get(a[0]) ?? null,
        all: async () => ({ results: [] }),
      }),
    }),
  } as any;
}

describe('cuvar oblika seme', () => {
  it('broji redove i kolone', () => {
    expect(blockShape(PAGE, 'stanice')).toBe('2x8');
    expect(blockShape(PAGE, 'posljednje')).toBe('2x9');
    expect(blockShape(PAGE, 'nema')).toBe('missing');
    expect(schemaFingerprint(PAGE, ['stanice', 'posljednje'])).toBe('stanice:2x8|posljednje:2x9');
  });
  it('prvo vidjenje pamti, isto prolazi', async () => {
    const db = fakeDb();
    const fp = schemaFingerprint(PAGE, ['stanice', 'posljednje']);
    expect(await checkSchema(db, 'aws', fp)).toEqual({ changed: false, first: true });
    expect(await checkSchema(db, 'aws', fp)).toEqual({ changed: false, first: false });
  });
  it('nova kolona javi dvaput pa se prihvati treci put', async () => {
    const db = fakeDb();
    const fp = schemaFingerprint(PAGE, ['stanice', 'posljednje']);
    await checkSchema(db, 'aws', fp);
    const changed = PAGE.replace('"13463",42.43648', '"13463","novo",42.43648');
    const fp2 = schemaFingerprint(changed, ['stanice', 'posljednje']);
    expect(fp2).not.toBe(fp);
    expect((await checkSchema(db, 'aws', fp2)).changed).toBe(true);
    expect((await checkSchema(db, 'aws', fp2)).changed).toBe(true);
    expect((await checkSchema(db, 'aws', fp2)).changed).toBe(false);
    expect((await checkSchema(db, 'aws', fp2)).changed).toBe(false);
  });
  it('jedno djubre ne ostaje: vrati staro i prodje', async () => {
    const db = fakeDb();
    const fp = schemaFingerprint(PAGE, ['stanice', 'posljednje']);
    await checkSchema(db, 'aws', fp);
    expect((await checkSchema(db, 'aws', 'stanice:1x1|posljednje:1x1')).changed).toBe(true);
    expect((await checkSchema(db, 'aws', fp)).changed).toBe(false);
  });
});
