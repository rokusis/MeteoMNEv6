export type ResponseKind = 'valid' | 'no_data' | 'empty' | 'generic_html' | 'invalid';

export function classifyBody(text: string): ResponseKind {
  const t = text.trim().toLowerCase();
  if (!t) return 'empty';
  if (t.includes('no data')) return 'no_data';
  if (t.includes('var posljednje') || t.includes('var stanice') || t.includes('var dataall') || t.includes('var sinop')) return 'valid';
  if (t.includes('<html') && !t.includes('var ')) return 'generic_html';
  if (t === '[]' || t === '{}' || t.includes('dataall = []') || t.includes('data_all = []')) return 'empty';
  return 'invalid';
}

export function isValidAwsBody(text: string): boolean {
  return text.includes('var posljednje') && text.includes('var stanice');
}
