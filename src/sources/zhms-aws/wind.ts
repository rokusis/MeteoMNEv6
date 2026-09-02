export function windCodeToDegrees(code: number | undefined): number | undefined {
  if (code == null || !Number.isFinite(code)) return undefined;
  if (code < 0 || code > 32) return undefined;
  return Math.round(code * 11.25 * 10) / 10;
}

export function windCodeToCompass(code: number | undefined): string | undefined {
  if (code == null || code < 0 || code > 32) return undefined;
  const deg = windCodeToDegrees(code)!;
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}
