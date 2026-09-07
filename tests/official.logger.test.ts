import { describe, it, expect, vi, afterEach } from 'vitest';
import { logOfficialSentinel, officialFingerprint } from '../src/jobs/officialLogger';

const PAGE1 = `
<div id="tab_a"><div class="prognoza-title">Petak, 04.09.2026.</div><div class="prognoza-text">Suncano.</div><div class="prognoza-sign">prognoza azurirana: 03.09.2026. 11:45 CEST</div><img src="/Meteorologija/Pr/cgprognoza-A.svg" /></div>
<div id="tab_b"><div class="prognoza-title">Subota, 05.09.2026.</div><div class="prognoza-text">Oblacno.</div><div class="prognoza-sign">prognoza azurirana: 03.09.2026. 11:42 CEST</div><img src="/Meteorologija/Pr/cgprognoza-B.svg" /></div>
<div id="tab_c"><div class="prognoza-title">Prognoza za pomorce, 03.09.2026.</div><div class="prognoza-text">Vjetar NW.</div><div class="prognoza-sign">prognoza azurirana: 03.09.2026. 11:41 CEST</div><img src="/Meteorologija/Pr/jjadran.svg" /></div>
`;
const PAGE2 = PAGE1.replace('11:45 CEST', '17:20 CEST').replace('Petak, 04.09.2026.', 'Petak, 04.09.2026.');

function fakeDb() {
  const rows: any[] = [];
  return {
    rows,
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          rows.push({ checked_at: a[0], status: a[1], fingerprint: a[2], titles: a[3] });
        },
        first: async () => (sql.includes('SELECT fingerprint') && rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
        all: async () => ({ results: rows }),
      }),
      first: async () => (rows.length ? { fingerprint: rows[rows.length - 1].fingerprint } : null),
      all: async () => ({ results: rows }),
    }),
  } as any;
}

describe('official merac', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prvi/same/changed redom', async () => {
    const db = fakeDb();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE1, { status: 200 }) as any);
    await logOfficialSentinel(db);
    expect(db.rows[0].status).toBe('first');
    await logOfficialSentinel(db);
    expect(db.rows[1].status).toBe('same');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(PAGE2, { status: 200 }) as any);
    await logOfficialSentinel(db);
    expect(db.rows[2].status).toBe('changed');
  });
  it('otissak se menja izmenom vremena izdavanja', () => {
    expect(officialFingerprint({ days: [{ title: 'P', issuedAt: '11:45' }] })).not.toBe(
      officialFingerprint({ days: [{ title: 'P', issuedAt: '17:20' }] }),
    );
  });
});
