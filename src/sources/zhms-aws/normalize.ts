import type { Station } from './parseStations';
import type { RawObservation } from './parseObservations';
import { windCodeToDegrees, windCodeToCompass } from './wind';

export interface NormalizedStation {
  stationId: string;
  wmoId?: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  stationType?: string;
  isActive: boolean;
}

export interface NormalizedObservation {
  stationId: string;
  stationName: string;
  measuredAtRaw: string;
  temperatureC?: number;
  precipitationMm?: number;
  windSpeedMs?: number;
  windDirectionCode?: number;
  windDirectionDeg?: number;
  windCompass?: string;
  gustMs?: number;
  isActiveStation: boolean;
}

export function normalizeStations(stations: Station[]): Map<string, NormalizedStation> {
  const m = new Map<string, NormalizedStation>();
  for (const s of stations) {
    m.set(s.stationId, {
      stationId: s.stationId,
      wmoId: s.wmoId,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      elevation: s.elevation,
      stationType: s.stationType,
      isActive: (s.statusFlag as any) === 1 || s.statusFlag === '1' || (s.statusFlag as any) === true,
    });
  }
  return m;
}

export function normalizeObservations(stations: Station[], observations: RawObservation[]): NormalizedObservation[] {
  const map = normalizeStations(stations);
  const out: NormalizedObservation[] = [];
  for (const o of observations) {
    const st = map.get(o.stationId);
    if (!st) continue;
    out.push({
      stationId: o.stationId,
      stationName: st.name,
      measuredAtRaw: o.measuredAtRaw,
      temperatureC: o.temperatureC,
      precipitationMm: o.precipitationMm,
      windSpeedMs: o.windSpeedMs,
      windDirectionCode: o.windDirectionCode,
      windDirectionDeg: windCodeToDegrees(o.windDirectionCode),
      windCompass: windCodeToCompass(o.windDirectionCode),
      gustMs: o.gustMs,
      isActiveStation: st.isActive,
    });
  }
  return out;
}
