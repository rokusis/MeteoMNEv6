import { describe, it, expect } from 'vitest';
import { checkHealth } from '../src/lib/health';

function agoMin(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}

function fakeDb(opts: { awsMin: number | null; graphMin: number | null; synopMin: number | null; offChecked: number | null; numPendingMin: number | null }) {
  return {
    prepare: (sql: string) => ({
      bind: (...a: any[]) => ({
        run: async () => {},
        first: async () => {
          if (sql.includes('FROM source_status')) {
            const src = a[0];
            const age = src === 'aws' ? opts.awsMin : opts.graphMin;
            return age == null ? null : { last_success_at: agoMin(age) };
          }
          if (sql.includes('FROM synop_cache')) {
            return opts.synopMin == null ? null : { meta_hour: '14', meta_day: '2026/09/08', fetched_at: agoMin(opts.synopMin) };
          }
          return null;
        },
        all: async () => {
          if (sql.includes('FROM official_log') || sql.includes('FROM hydro_log') || sql.includes('FROM sea_snow_log')) {
            if (opts.offChecked == null) return { results: [] };
            return { results: [{ checked_at: agoMin(opts.offChecked), status: 'same' }] };
          }
          if (sql.includes('FROM numerical_refresh')) {
            if (opts.numPendingMin == null) return { results: [] };
            return { results: [{ model: 'e3km', status: 'pending', updated_at: agoMin(opts.numPendingMin) }] };
          }
          return { results: [] };
        },
      }),
      first: async () => null,
      all: async () => {
        if (sql.includes('FROM numerical_refresh')) {
          if (opts.numPendingMin == null) return { results: [] };
          return { results: [{ model: 'e3km', status: 'pending', updated_at: agoMin(opts.numPendingMin) }] };
        }
        return { results: [] };
      },
    }),
  } as any;
}

describe('cuvar zdravlja', () => {
  it('sve sveze daje ok', async () => {
    const r = await checkHealth(fakeDb({ awsMin: 1, graphMin: 2, synopMin: 60, offChecked: 5, numPendingMin: null }));
    expect(r.sources.find((s) => s.source === 'aws-bulk')?.state).toBe('ok');
    expect(r.sources.find((s) => s.source === 'graph-hpr')?.state).toBe('ok');
  });
  it('star bulk daje degraded', async () => {
    const r = await checkHealth(fakeDb({ awsMin: 25, graphMin: 2, synopMin: 60, offChecked: 5, numPendingMin: null }));
    expect(r.status).toBe('degraded');
    expect(r.sources.find((s) => s.source === 'aws-bulk')?.state).toBe('stale');
  });
  it('zaglavljena tura daje stale', async () => {
    const r = await checkHealth(fakeDb({ awsMin: 1, graphMin: 2, synopMin: 60, offChecked: 5, numPendingMin: 90 }));
    expect(r.sources.find((s) => s.source === 'numerical')?.state).toBe('stale');
  });
  it('prazna baza daje unknown, ne stale', async () => {
    const r = await checkHealth(fakeDb({ awsMin: null, graphMin: null, synopMin: null, offChecked: null, numPendingMin: null }));
    expect(r.status).toBe('unknown');
  });
});
