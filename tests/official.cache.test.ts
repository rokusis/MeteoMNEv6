import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveOfficial, loadOfficial, shouldPersistOfficial, getOfficial } from '../src/sources/zhms-official-forecast/liveOfficial';

const DAYS2 = {
  days: [
    { title: 'Petak', text: 'Suncano vreme.', issuedAt: '03.09.2026.' },
    { title: 'Subota', text: 'Oblacno vreme.', issuedAt: '03.09.2026.' },
  ],
};

function fakeDb() {
  let payload: string | null = null;
  let fetchedAt = '';
  return {
    _get: () => ({ payload, fetchedAt }),
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          if (sql.includes('INSERT INTO official_cache')) {
            payload = a[1];
            fetchedAt = a[0];
          }
        },
        first: async () => (payload ? { fetched_at: fetchedAt, payload } : null),
        all: async () => ({ results: [] }),
      }),
      first: async () => (payload ? { fetched_at: fetchedAt, payload } : null),
      all: async () => ({ results: [] }),
    }),
  } as any;
}

describe('official kes za sluzenje', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('prazno ne prepisuje dobar kes', () => {
    expect(shouldPersistOfficial(null, { days: [] })).toBe(false);
    expect(shouldPersistOfficial({ days: DAYS2.days }, { days: [] })).toBe(false);
  });
  it('manji skup ne brise veci', () => {
    expect(shouldPersistOfficial({ days: DAYS2.days }, { days: DAYS2.days.slice(0, 1) })).toBe(false);
  });
  it('veci ili isti skup prolazi', () => {
    expect(shouldPersistOfficial(null, DAYS2)).toBe(true);
    expect(shouldPersistOfficial({ days: DAYS2.days }, DAYS2)).toBe(true);
  });
  it('save pa load vrati isto', async () => {
    const db = fakeDb();
    await saveOfficial(db, DAYS2);
    const c = await loadOfficial(db);
    expect(c?.days?.length).toBe(2);
    expect(c?.days?.[0]?.title).toBe('Petak');
  });
  it('getOfficial sluzi iz baze bez mreze', async () => {
    const db = fakeDb();
    await saveOfficial(db, DAYS2);
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('mreza ne sme da se dira');
    });
    const r = await getOfficial(db);
    expect(r.fromCache).toBe(true);
    expect(r.days.length).toBe(2);
    expect(spy).not.toHaveBeenCalled();
  });
});
