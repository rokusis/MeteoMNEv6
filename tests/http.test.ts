import { describe, it, expect, vi, afterEach } from 'vitest';
import { zhmsFetch, HttpError } from '../src/lib/http';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('zhmsFetch - postar', () => {
  it('salje GET i User-Agent', async () => {
    const fakeRes = new Response('ok', { status: 200 });
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeRes as any);
    await zhmsFetch('https://www.meteo.co.me/test');
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts]: any = spy.mock.calls[0];
    expect(url).toBe('https://www.meteo.co.me/test');
    expect(opts.method).toBe('GET');
    expect(opts.headers['User-Agent']).toContain('MeteoMNEv6');
  });

  it('baca timeout ako nema odgovora 10ms', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url: any, opts: any) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const e: any = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    });
    await expect(zhmsFetch('https://www.meteo.co.me/slow', { timeoutMs: 10 })).rejects.toBeInstanceOf(HttpError);
    await expect(zhmsFetch('https://www.meteo.co.me/slow', { timeoutMs: 10 })).rejects.toMatchObject({ kind: 'timeout' });
  });
});
