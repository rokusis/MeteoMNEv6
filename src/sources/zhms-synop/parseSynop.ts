export interface SynopRawStation {
  sifra: string;
  naziv: string;
  sat: string;
  ww?: unknown;
  obl?: unknown;
  VBNobl?: unknown;
  _unresolved?: Record<string, unknown>;
}
export interface SynopMeta { hour?: string; day?: string }
export interface SynopParseResult { meta: SynopMeta; stations: SynopRawStation[] }

function extractVarBlock(src: string, startMarker: string): string {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error('missing ' + startMarker);
  const openIdx = src.indexOf('[', start);
  if (openIdx === -1) throw new Error('missing sinop array');
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  throw new Error('unclosed sinop array');
}

function splitObjects(arraySrc: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let inStr: string | null = null;
  let inObj = false;
  for (let i = 0; i < arraySrc.length; i++) {
    const c = arraySrc[i];
    if (inStr) {
      if (inObj) cur += c;
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"') {
      inStr = c;
      if (inObj) cur += c;
      continue;
    }
    if (!inObj) {
      if (c === '{') { inObj = true; depth = 1; cur = '{'; }
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
    cur += c;
    if (depth === 0 && inObj) {
      out.push(cur);
      cur = '';
      inObj = false;
    }
  }
  return out.filter(s => s.includes('sifra'));
}

function getField(objSrc: string, name: string): string | undefined {
  const m = objSrc.match(new RegExp("\\b" + name + "\\s*:\\s*('[^']*'|\"[^\"]*\"|[^,}]+)"));
  if (!m) return undefined;
  return m[1].trim();
}

function unquote(v: string): string {
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) return v.slice(1, -1);
  return v;
}

export function parseSynop(src: string): SynopParseResult {
  if (!src || !src.includes('var sinop')) throw new Error('missing var sinop');
  if (src.includes('no data')) throw new Error('no data');
  const hourM = src.match(/var\s+sinopCGHour\s*=\s*(\d+)/);
  const dayM = src.match(/var\s+sinopCGDay\s*=\s*"([^"]+)"/);
  const block = extractVarBlock(src, 'var sinop');
  const objs = splitObjects(block);
  if (objs.length === 0) throw new Error('empty sinop');
  const stations: SynopRawStation[] = objs.map(o => {
    const sifra = getField(o, 'sifra');
    const naziv = getField(o, 'naziv');
    const sat = getField(o, 'sat');
    if (!sifra || !naziv || !sat) throw new Error('missing sifra/naziv/sat');
    const ww = getField(o, 'ww');
    const obl = getField(o, 'obl');
    const vb = getField(o, 'VBNobl');
    return {
      sifra: unquote(sifra),
      naziv: unquote(naziv),
      sat: unquote(sat),
      ww: ww === undefined ? undefined : unquote(ww),
      obl: obl === undefined ? undefined : unquote(obl),
      VBNobl: vb === undefined ? undefined : unquote(vb),
      _unresolved: {},
    };
  });
  return { meta: { hour: hourM?.[1], day: dayM?.[1] }, stations };
}
