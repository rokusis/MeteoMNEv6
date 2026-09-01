import { describe, it, expect } from 'vitest';
import worker from '../src/index';
describe('skeleton', () => {
  it('vraca ok za root', async () => {
    const res = await worker.fetch(new Request('http://test/'), {});
    const data: any = await res.json();
    expect(data.status).toBe('ok');
  });
  it('vraca ok za /api/status', async () => {
    const res = await worker.fetch(new Request('http://test/api/status'), { APP_NAME: 'MeteoMNEv6' });
    const data: any = await res.json();
    expect(data.status).toBe('ok');
  });
});
