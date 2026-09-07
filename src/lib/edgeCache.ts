// Ivica kesa ispred baze: isti odgovor za sve 60 sekundi.
// Kad caches ne postoji (testovi) ili nesto pukne, samo propusti dalje.
export async function cachedApi(
  request: Request,
  ctx: any,
  produce: () => Promise<Response>,
  maxAgeSec: number = 60,
): Promise<Response> {
  let store: any = null;
  try {
    store = (globalThis as any).caches?.default ?? null;
  } catch {
    store = null;
  }
  if (!store) return produce();
  try {
    const hit = await store.match(request);
    if (hit) return hit;
  } catch {}
  const res = await produce();
  if (!res.ok) return res;
  try {
    const copy = new Response(res.body, res);
    copy.headers.set('Cache-Control', `public, max-age=${maxAgeSec}, stale-while-revalidate=30`);
    const p = store.put(request, copy.clone()).catch(() => {});
    try {
      if (ctx?.waitUntil) ctx.waitUntil(p);
      else await p;
    } catch {
      await p.catch(() => {});
    }
    return copy;
  } catch {
    return res;
  }
}
