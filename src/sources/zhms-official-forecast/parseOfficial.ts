export interface OfficialForecast { issuedAt?: string; days: { title: string; text: string; issuedAt?: string; image?: string }[]; seafarer?: { title: string; text: string; issuedAt?: string; image?: string }; rawHtml: string; }
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function extractTab(html: string, tabId: string): { title: string; text: string; issuedAt?: string; image?: string } | null {
  const start = html.indexOf(`id="${tabId}"`);
  if (start === -1) return null;
  const slice = html.slice(start, start+5000);
  const t1 = slice.match(/<div class="prognoza-title">\s*([^<]+?)\s*<\/div>/i);
  const t2 = slice.match(/<div class="prognoza-text">\s*([\s\S]*?)\s*<\/div>/i);
  const t3 = slice.match(/<div class="prognoza-sign"[^>]*>\s*([^<]+?)\s*<\/div>/i);
  if (!t1 || !t2) return null;
  const title = stripHtml(t1[1]);
  const text = stripHtml(t2[1]);
  const issuedAt = t3 ? stripHtml(t3[1]) : undefined;
  const imgM = slice.match(/<img[^>]+src="([^"]+cgprognoza[^"]*\.svg[^"]*)"/i) || slice.match(/<img[^>]+src="([^"]+\.svg[^"]*)"/i);
  let image = imgM ? imgM[1] : undefined;
  if (image && image.startsWith("/")) image = "https://www.meteo.co.me" + image;
  if (image && image.startsWith("/")) image = "https://www.meteo.co.me" + image;
  if (!text || text.length < 5) return null;
  return { title, text: text.slice(0, 1500), issuedAt, image };
}
function extractSeafarer(html: string): { title: string; text: string; issuedAt?: string; image?: string } | undefined {
  const start = html.indexOf('id="tab_c"');
  const slice = start !== -1 ? html.slice(start, start+5000) : html;
  const m = slice.match(/<div class="prognoza-text">\s*([\s\S]*?)\s*<\/div>/i);
  if (m) {
    const text = stripHtml(m[1]);
    const imgM = slice.match(/<img[^>]+src="([^"]+jjadran[^"]*\.svg[^"]*)"/i);
    const titleM = slice.match(/<div class="prognoza-title">\s*([^<]+?)\s*<\/div>/i);
    const signM = slice.match(/<div class="prognoza-sign"[^>]*>\s*([^<]+?)\s*<\/div>/i);
    return { title: titleM ? stripHtml(titleM[1]) : "Za pomorce", text: text.slice(0, 1500), issuedAt: signM ? stripHtml(signM[1]) : undefined, image: imgM ? imgM[1] : undefined };
  }
  const idx = html.toLowerCase().indexOf('za pomorce');
  if (idx !== -1) {
    const t = stripHtml(html.slice(idx, idx+2500));
    if (t.length > 20) return { title: "Za pomorce", text: t.slice(0, 1200) };
  }
  return undefined;
}
export function parseOfficial(html: string): OfficialForecast {
  const days: { title: string; text: string; issuedAt?: string; image?: string }[] = [];
  const a = extractTab(html, 'tab_a');
  const b = extractTab(html, 'tab_b');
  if (a) days.push(a);
  if (b) days.push(b);
  const seafarer = extractSeafarer(html);
  const issuedAt = days[0]?.issuedAt;
  return { issuedAt, days, seafarer, rawHtml: html.slice(0, 2000) };
}
