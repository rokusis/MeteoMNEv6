import { describe, it, expect } from 'vitest';
import worker from '../src/index';
describe('skeleton', () => {
  it('vraca html za root', async () => {
    const req = new Request('http://test/');
    const res = await worker.fetch(req, {} as any);
    expect(res.headers.get('content-type')).toContain('text/html');
    const text = await res.text();
    expect(text).toContain('MeteoMNE');
  });
  it('vraca ok za /api/status', async () => {
    const req = new Request('http://test/api/status');
    const res = await worker.fetch(req, { APP_NAME: 'MeteoMNEv6' } as any);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
  });
});
