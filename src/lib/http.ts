export type HttpErrorKind = 'transport' | 'timeout' | 'http';

export class HttpError extends Error {
  kind: HttpErrorKind;
  status?: number;
  constructor(message: string, kind: HttpErrorKind, status?: number) {
    super(message);
    this.name = 'HttpError';
    this.kind = kind;
    this.status = status;
  }
}

export interface FetchOptions {
  timeoutMs?: number;
  userAgent?: string;
  headers?: Record<string,string>;
}

const DEFAULT_UA = 'MeteoMNEv6/1.0 (+https://github.com/rokusis/MeteoMNEv6)';
const DEFAULT_TIMEOUT_MS = 10000;

export async function zhmsFetch(url: string, opts: FetchOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent ?? DEFAULT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...opts.headers,
      },
      signal: controller.signal,
    });
    return res;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new HttpError(`timeout ${url} after ${timeoutMs}ms`, 'timeout');
    throw new HttpError(String(e?.message ?? e), 'transport');
  } finally {
    clearTimeout(id);
  }
}
