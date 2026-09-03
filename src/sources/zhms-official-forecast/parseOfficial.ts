export interface OfficialForecast { issuedAt?: string; days: { title: string; text: string; issuedAt?: string; image?: string }[]; seafarer?: { title: string; text: string; issuedAt?: string; image?: string }; rawHtml: string; }

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTab(html: string, tabId: string): { title: string; text: string; issuedAt?: string; image?: string } | null {
  const tabRe = new RegExp(`<div[^>]+id="${tabId}"[\\s\\S]*?<div class="prognoza-title">\\s*([^<]+?)\\s*<\\/div>\\s*<div class="prognoza-text">\\s*([\\s\\S]*?)\\s*<\\/div>\\s*<div class="prognoza-sign"[^>]*>\\s*([^<]+?)\\s*<\\/div>`, 'i');
  const m = html.match(tabRe);
  if (!m) return null;
  const title = stripHtml(m[1]);
  const text = stripHtml(m[2]);
  const issuedAt = stripHtml(m[3]);
  const after = html.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 3000);
  const imgM = after.match(/<img[^>]+src="([^"]+cgprognoza[^"]*\.svg[^"]*)"/) || html.match(new RegExp(`<div[^>]+id="${tabId}"[\\s\\S]*?<img[^>]+src="([^"]+\\.svg[^"]*)"`));
  const image = imgM ? imgM[1] : undefined;
  if (!text || text.length < 20) return null;
  return { title, text: text.slice(0, 1500), issuedAt, image };
}

function extractSeafarer(html: string): { title: string; text: string; issuedAt?: string; image?: string } | undefined {
  const tabCRe = /<div[^>]+id="tab_c"[\s\S]*?<div class="prognoza-text">\s*([\s\S]*?)\s*<\/div>/i;
  const m = html.match(tabCRe);
  if (m) {
    const text = stripHtml(m[1]);
    const after = html.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 3000);
    const imgM = after.match(/<img[^>]+src="([^"]+jjadran[^"]*\.svg[^"]*)"/) || html.match(/<img[^>]+src="([^"]+jjadran[^"]*\.svg[^"]*)"/);
    // trazi naslov i vrijeme za pomorce
    const titleM = html.match(/<div[^>]+id="tab_c"[\s\S]*?<div class="prognoza-title">\s*([^<]+?)\s*<\/div>/i);
    const signM = html.slice((m.index ?? 0), (m.index ?? 0)+3000).match(/<div class="prognoza-sign"[^>]*>\s*([^<]+?)\s*<\/div>/i);
    return { title: titleM ? stripHtml(titleM[1]) : "Za pomorce", text: text.slice(0, 1500), issuedAt: signM ? stripHtml(signM[1]) : undefined, image: imgM ? imgM[1] : undefined };
  }
  // fallback
  const idx = html.toLowerCase().indexOf('za pomorce');
  if (idx !== -1) {
    const snippet = html.slice(idx, idx+2500);
    const t = stripHtml(snippet);
    if (t.length > 20) return { title: "Za pomorce", text: t.slice(0, 1200) };
  }
  return undefined;
}

export function parseOfficial(html: string): OfficialForecast {
  const days: { title: string; text: string; issuedAt?: string; image?: string }[] = [];
  const a = extractTab(html, 'tab_a');
  const b = extractTab(html, 'tab_b');
  const c = extractTab(html, 'tab_c');
  // tab_a i tab_b su danas/sjutra - uzimamo tacno kako pise (npr. Petak, 04.09.2026.)
  if (a) days.push(a);
  if (b) days.push(b);
  // tab_c je za pomorce, ne ide u days nego u seafarer
  const seafarer = extractSeafarer(html) || (c ? { title: c.title, text: c.text, issuedAt: c.issuedAt, image: c.image } : undefined);
  // ako c nije pomorci nego treci dan, a nema pomoraca, onda je c treci dan
  if (c && !seafarer) days.push(c);
  const issuedAt = days[0]?.issuedAt;
  return { issuedAt, days, seafarer, rawHtml: html.slice(0, 2000) };
}
