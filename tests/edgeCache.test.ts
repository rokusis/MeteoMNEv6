import { describe, it, expect, vi, afterEach } from 'vitest';
import { cachedApi } from '../src/lib/edgeCache';

describe('edge kes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('bez kesa propusti dalje', async () => {
    const req = new Request('http://test/api/stations');
    const r = await cachedApi(req, null, async () => Response.json({ a: 1 }));
    expect(await r.json()).toEqual({ a: 1 });
  });
  it('drugi put cita iz kesa', async () => {
    const mem = new Map<string, Response>();
    (globalThis as any).caches = {
      default: {
        match: async (req: Request) => mem.get(req.url) ?? undefined,
        put: async (req: Request, res: Response) => {
          mem.set(req.url, res);
        },
      },
    };
    try {
      let n = 0;
      const req = new Request('http://test/api/x');
      const prod = async () => {
        n++;
        return Response.json({ n });
      };
      const r1 = await cachedApi(req, null, prod);
      expect(await r1.json()).toEqual({ n: 1 });
      const r2 = await cachedApi(req, null, prod);
      expect(await r2.json()).toEqual({ n: 1 });
      expect(n).toBe(1);
    } finally {
      delete (globalThis as any).caches;
    }
  });
});
