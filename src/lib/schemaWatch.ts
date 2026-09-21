export interface SchemaCheck {
  changed: boolean;
  first: boolean;
}

// Otisak oblika strane: broj redova x broj kolona prvog reda po var bloku.
// Sluzi da uhvati promenu seme (nova kolona pomeri pozicije) pre nego sto
// parser tiho da pogresne podatke. Radi nad sirovim tekstom, postujuci stringove.
function extractBlock(src: string, startIdx: number): string | null {
  const openIdx = src.indexOf('[', startIdx);
  if (openIdx === -1) return null;
  let depth = 0;
  let inStr = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[') depth++;
    if (c === ']') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return null;
}

// Grupe prvog nivoa unutar bloka: redovi.
function topGroups(block: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  let inEntry = false;
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (inStr) {
      if (inEntry) cur += c;
      if (c === '\\') {
        if (inEntry && i + 1 < block.length) { cur += block[i + 1]; i++; }
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; if (inEntry) cur += c; continue; }
    if (!inEntry) {
      if (c === '[') {
        if (depth === 0) { depth = 1; continue; }
        inEntry = true; depth = 2; cur = '[';
      }
      continue;
    }
    if (c === '[') depth++;
    if (c === ']') depth--;
    cur += c;
    if (depth === 1 && inEntry) {
      out.push(cur);
      cur = '';
      inEntry = false;
    }
  }
  return out;
}

function countFields(entrySrc: string): number {
  const inner = entrySrc.trim().replace(/^\[/, '').replace(/\]$/, '');
  let n = 1;
  let inStr = false;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === '\\' && i + 1 < inner.length) { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) n++;
  }
  return n;
}

// Oblik jednog var bloka: brojRedova x brojKolonaPrvogReda. Prazan blok je 0x0.
export function blockShape(src: string, varName: string): string {
  const kw = 'var ' + varName;
  const start = src.indexOf(kw);
  if (start === -1) return 'missing';
  const block = extractBlock(src, start + kw.length);
  if (!block) return 'unclosed';
  const groups = topGroups(block);
  if (!groups.length) return '0x0';
  return groups.length + 'x' + countFields(groups[0]);
}

export function schemaFingerprint(text: string, varNames: string[]): string {
  return varNames.map((v) => v + ':' + blockShape(text, v)).join('|');
}

// Cuvar: prvo vidjenje pamti; isti oblik prolazi; drugaciji oblik se broji
// kao kandidat - posle 3 ista nova oblika za redom prihvata se kao novo
// normalno (redizajn izvora), a do tad pozivalac baca gresku pa vazi
// zadnje-dobro (DEC-006). Prolazno djubre (1 los fetch) nikad ne prodje.
export async function checkSchema(db: D1Database, source: string, fp: string): Promise<SchemaCheck> {
  const now = new Date().toISOString();
  let row: any = null;
  try {
    row = await db.prepare(`SELECT fingerprint, pending_fp, pending_hits FROM schema_state WHERE source=?`).bind(source).first();
  } catch {}
  if (!row) {
    try {
      await db.prepare(`INSERT INTO schema_state (source, fingerprint, pending_fp, pending_hits, updated_at) VALUES (?, ?, NULL, 0, ?)`).bind(source, fp, now).run();
    } catch {}
    return { changed: false, first: true };
  }
  if (row.fingerprint === fp) {
    if (row.pending_fp != null) {
      try {
        await db.prepare(`UPDATE schema_state SET pending_fp=NULL, pending_hits=0, updated_at=? WHERE source=?`).bind(now, source).run();
      } catch {}
    }
    return { changed: false, first: false };
  }
  const hits = row.pending_fp === fp ? (row.pending_hits ?? 0) + 1 : 1;
  if (hits >= 3) {
    try {
      await db.prepare(`UPDATE schema_state SET fingerprint=?, pending_fp=NULL, pending_hits=0, updated_at=? WHERE source=?`).bind(fp, now, source).run();
    } catch {}
    return { changed: false, first: false };
  }
  try {
    await db.prepare(`UPDATE schema_state SET pending_fp=?, pending_hits=?, updated_at=? WHERE source=?`).bind(fp, hits, now, source).run();
  } catch {}
  return { changed: true, first: false };
}
