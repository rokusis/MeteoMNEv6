import { describe, it, expect } from 'vitest';
import { markTickStart, markTickEnd } from '../src/lib/tick';

function fakeDb() {
  const calls: any[] = [];
  return {
    calls,
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {
          calls.push({ sql, args: a });
        },
      }),
    }),
  } as any;
}

describe('otkucaj kruga', () => {
  it('pocetak dize fetched, kraj dize i success', async () => {
    const db = fakeDb();
    await markTickStart(db, 'tick-minute');
    await markTickEnd(db, 'tick-minute');
    expect(db.calls.length).toBe(2);
    expect(db.calls[0].args[0]).toBe('tick-minute');
    expect(db.calls[1].args[0]).toBe('tick-minute');
    expect(db.calls[1].sql).toContain('last_success_at');
  });
  it('ne baca kad baze nema ili puca', async () => {
    await markTickStart(null, 'tick-minute');
    await markTickEnd(null, 'tick-minute');
    const bad = { prepare: () => { throw new Error('nope'); } };
    await markTickStart(bad, 'tick-minute');
    await markTickEnd(bad, 'tick-minute');
  });
});
