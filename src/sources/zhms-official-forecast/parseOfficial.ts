export interface OfficialForecast { issuedAt?: string; days: { date?: string; title?: string; text: string }[]; seafarer?: string; rawHtml: string; }

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractIssuedAt(html: string): string | undefined {
  const m = html.match(/(\d{2}\.\d{2}\.\d{4}[^\n<]*\d{1,2}:\d{2})/);
  return m ? m[1].trim() : undefined;
}

export function parseOfficial(html: string): OfficialForecast {
  const days: { date?: string; title?: string; text: string }[] = [];
  // pokusaj da nadjes glavni sadrzaj - izmedju <div class="content"> ili slicno, ali posto je CMS, uzmi sav tekst pa podijeli po danima
  const text = stripHtml(html);
  // ako ima "Danas", "Sjutra" - podijeli
  const parts = text.split(/(Danas|Sjutra|Prekosjutra|Za \d+ dana|PONEDJELJAK|UTORAK|SRIJEDA|ČETVRTAK|PETAK|SUBOTA|NEDJELJA)/i);
  if (parts.length > 1) {
    for (let i=1; i<parts.length; i+=2) {
      const title = parts[i]?.trim();
      const body = parts[i+1]?.trim();
      if (title && body && body.length > 20) days.push({ title, text: body.slice(0, 800) });
    }
  }
  if (days.length === 0) {
    // fallback: cijeli tekst kao jedan dan
    const body = text.slice(0, 2000);
    if (body.length > 20) days.push({ text: body });
  }
  let seafarer: string | undefined;
  const seaIdx = text.toLowerCase().indexOf('pomor');
  if (seaIdx !== -1) seafarer = text.slice(seaIdx, seaIdx+800).trim();
  return { issuedAt: extractIssuedAt(html), days, seafarer, rawHtml: html.slice(0, 5000) };
}
