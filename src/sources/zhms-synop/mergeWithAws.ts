import type { SynopRawStation } from './parseSynop';
import { synopKind } from './weatherKind';

export interface AwsLike {
  stationId?: string;
  wmoId?: string | null;
  stationName?: string;
  name?: string;
}

export interface AwsWithSynop<T extends AwsLike> {
  aws: T;
  synopText?: string | null;
  synopSymbolIndex?: number | null;
  synopStatus: 'NONE' | 'OK' | 'UNRESOLVED';
  synopSat?: string;
}

function normName(s: string | undefined | null): string {
  return String(s ?? '').trim().toLowerCase();
}

export function attachSynopKind<T extends AwsLike>(aws: T, synopList: SynopRawStation[]): AwsWithSynop<T> {
  const wmo = String(aws.wmoId ?? '').trim();
  const nm = normName(aws.stationName ?? aws.name);
  let hit: SynopRawStation | undefined;
  if (wmo) hit = synopList.find(s => String(s.sifra).trim() === wmo);
  if (!hit && nm) hit = synopList.find(s => normName(s.naziv) === nm);
  if (!hit) return { aws, synopStatus: 'NONE' };
  const k = synopKind(hit.ww, hit.obl, hit.VBNobl);
  return {
    aws,
    synopText: k.text,
    synopSymbolIndex: k.symbolIndex,
    synopStatus: k.status === 'OK' ? 'OK' : 'UNRESOLVED',
    synopSat: hit.sat,
  };
}
