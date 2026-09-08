import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAndPersist, bulkFingerprint } from '../src/sources/zhms-aws/live';

const AWS_HTML = `
var stanice = [["02PDGR10","13463",42.43648,19.27199,49,"Podgorica","glavna",1]];
var posljednje = {"glavna":[["02PDGR10","glavna","Podgorica","04.09.2026 17:10","25.0","0.0","2.0","16",""]]};
`;

function fakeDb() {
  let fp: string | null = null;
  const writes: string[] = [];
  return {
    writes,
    prepare: (sql: string) => ({
      bind: (..._a: any[]) => ({
        run: async () => {
          if (sql.includes('INTO bulk_state')) fp = _a[1];
          if (sql.includes('INTO stations') || sql.includes('INTO observations')) writes.push(sql.slice(0, 24));
        },
        first: async () => {
          if (sql.includes('FROM bulk_state')) return fp == null ? null : { fingerprint: fp };
          if (sql.includes('source_status')) return null;
          return null;
        },
        all: async () => ({ results: [] }),
      }),
      first: async () => (sql.includes('FROM bulk_state') ? (fp == null ? null : { fingerprint: fp }) : null),
      all: async () => ({ results: [] }),
      run: async () => {},
    }),
  } as any;
}

describe('bulk samo na promenu', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('otisak stabilan za isti sadrzaj', () => {
    const a = bulkFingerprint([{ stationId: 'X', measuredAtRaw: 't', temperatureC: 1 }]);
    const b = bulkFingerprint([{ stationId: 'X', measuredAtRaw: 't', temperatureC: 1 }]);
    const c = bulkFingerprint([{ stationId: 'X', measuredAtRaw: 't', temperatureC: 2 }]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
  it('drugi isti krug ne pise stanice', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(AWS_HTML, { status: 200 }) as any);
    await fetchAndPersist(db);
    expect(db.writes.length).toBeGreaterThan(0);
    db.writes.length = 0;
    await fetchAndPersist(db);
    expect(db.writes.length).toBe(0);
  });
});
