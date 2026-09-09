export interface AirValue { pollutant: string; valueRaw: string }
export interface AirStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  pin: string;
  dateRaw: string;
  values: AirValue[];
}

// Glavna strana epa.org.me/vazduh nosi sve stanice u jednom JS nizu:
// var points = [["Ime", lat, lon, "url/stanica/ID", "pin-klasa", "tooltip html"], ...]
// Tooltip sadrzi <p class='date'>DD.MM.YYYY HH:MM</p> i redove zagadjucih materija.
function extractPointsBlock(src: string): string {
  const start = src.indexOf('var points');
  if (start === -1) throw new Error('missing var points');
  const openIdx = src.indexOf('[', start);
  if (openIdx === -1) throw new Error('missing points array');
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
  throw new Error('unclosed points array');
}

// Vadi grupe [...] prvog nivoa (zapise stanica) postujuci stringove sa \" escape.
function splitEntries(arraySrc: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  let inEntry = false;
  for (let i = 0; i < arraySrc.length; i++) {
    const c = arraySrc[i];
    if (inStr) {
      if (inEntry) cur += c;
      if (c === '\\') {
        if (inEntry && i + 1 < arraySrc.length) { cur += arraySrc[i + 1]; i++; }
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; if (inEntry) cur += c; continue; }
    if (!inEntry) {
      if (c === '[') {
        // preskoci spoljasnju zagradu niza
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
  return out.filter(s => s.includes('"'));
}

// Deli zapis na polja po zarezima van stringova.
function splitFields(entrySrc: string): string[] {
  const inner = entrySrc.trim().replace(/^\[/, '').replace(/\]$/, '');
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === '\\' && i + 1 < inner.length) { cur += c + inner[i + 1]; i++; continue; }
      if (c === '"') { inStr = false; cur += c; continue; }
      cur += c;
      continue;
    }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return t;
}

function cleanCell(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&micro;/g, 'µ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTooltip(tip: string): { dateRaw: string; values: AirValue[] } {
  const dateM = tip.match(/<p class=['"]date['"]>([^<]+)<\/p>/);
  const dateRaw = dateM ? dateM[1].trim() : '';
  const values: AirValue[] = [];
  const re = /<div class\s*='rTableCell1[^']*'[^>]*>([\s\S]*?)<\/div>\s*<div class\s*='rTableCell2[^']*'[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tip)) !== null) {
    const pollutant = cleanCell(m[1]);
    const valueRaw = cleanCell(m[2]);
    if (!pollutant) continue;
    values.push({ pollutant, valueRaw });
  }
  return { dateRaw, values };
}

export function parseAir(src: string): AirStation[] {
  if (!src || !src.includes('var points')) throw new Error('missing var points');
  const block = extractPointsBlock(src);
  const entries = splitEntries(block);
  if (entries.length === 0) throw new Error('empty air');
  const out: AirStation[] = [];
  for (const e of entries) {
    const f = splitFields(e);
    if (f.length < 6) continue;
    const name = unquote(f[0]);
    const lat = Number(unquote(f[1]));
    const lon = Number(unquote(f[2]));
    const url = unquote(f[3]);
    const pin = unquote(f[4]);
    const tip = unquote(f[5]);
    const idM = url.match(/\/stanica\/(\d+)/);
    if (!name || !idM) continue;
    const { dateRaw, values } = parseTooltip(tip);
    if (!dateRaw) continue;
    out.push({
      id: idM[1],
      name,
      lat: Number.isFinite(lat) ? lat : 0,
      lon: Number.isFinite(lon) ? lon : 0,
      pin,
      dateRaw,
      values,
    });
  }
  if (out.length === 0) throw new Error('empty air');
  return out;
}
