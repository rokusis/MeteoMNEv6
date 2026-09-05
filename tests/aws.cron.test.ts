import { describe, it, expect, vi } from 'vitest';
import { getObservations } from '../src/sources/zhms-aws/live';
function freshDb() {
  const row = { station_id: '02PDGR10', wmo_id: '13463', stationName: 'Podgorica', is_active: 1, measured_at_raw: '04.09.2026 19:20', temperature_c: 25, precipitation_mm: 0, wind_speed_ms: 1, wind_direction_code: 2, wind_direction_deg: 22.5, wind_compass: 'NNE', gust_ms: null };
  return {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        all: async () => ({ results: String(sql).includes('observations o JOIN') ? [row] : [] }),
        first: async () => null,
        run: async () => {},
      }),
      first: async () => String(sql).includes('source_status') ? { lastOk: new Date().toISOString() } : null,
      all: async () => ({ results: String(sql).includes('observations o JOIN') ? [row] : [] }),
      run: async () => {},
    }),
  } as any;
}
describe('kron puni, api cita D1', () => {
  it('ne zove meteo kad je baza sveza', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ne sme zvati'));
    const r = await getObservations(freshDb());
    expect(r.observations[0].stationId).toBe('02PDGR10');
    expect(r.fromCache).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});
