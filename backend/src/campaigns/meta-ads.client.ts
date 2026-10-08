import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MetaAdsHttp = {
  post(
    path: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  get(
    path: string,
    token: string,
    query?: Record<string, string>,
  ): Promise<Record<string, unknown>>;
};

@Injectable()
export class MetaAdsClient implements MetaAdsHttp {
  constructor(private readonly config: ConfigService) {}

  private base() {
    const version =
      this.config.get<string>('META_GRAPH_VERSION')?.trim() || 'v21.0';
    return `https://graph.facebook.com/${version}`;
  }

  async post(path: string, token: string, body: Record<string, unknown>) {
    return this.send('POST', path, token, body);
  }

  async get(path: string, token: string, query: Record<string, string> = {}) {
    return this.send('GET', path, token, undefined, query);
  }

  private async send(
    method: 'GET' | 'POST',
    path: string,
    token: string,
    body?: Record<string, unknown>,
    query: Record<string, string> = {},
  ) {
    if (this.config.get<string>('META_ADS_MOCK') === 'true') {
      return mockResponse(method, path, body);
    }
    const url = new URL(`${this.base()}/${path.replace(/^\//, '')}`);
    url.searchParams.set('access_token', token);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    const retryReads = method === 'GET';
    const attempts = retryReads ? 3 : 1;
    let text = '';
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const res = await fetch(url, {
        method,
        headers:
          method === 'POST'
            ? { 'Content-Type': 'application/json' }
            : undefined,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      });
      text = await res.text();
      const limited = res.status === 429 || isRateLimitBody(text);
      if (res.ok) return JSON.parse(text) as Record<string, unknown>;
      if (!retryReads || !limited || attempt === attempts - 1) {
        throw new Error(text.slice(0, 800));
      }
      await sleep(400 * 2 ** attempt);
    }
    throw new Error(text.slice(0, 800));
  }
}

function isRateLimitBody(text: string) {
  return /"code"\s*:\s*(4|17|32|613|80004)\b/.test(text);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockIds = new Map<string, string>();

function mockResponse(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Record<string, unknown> {
  if (method === 'GET' && path.endsWith('/insights')) {
    return {
      data: [
        {
          date_start: new Date().toISOString().slice(0, 10),
          spend: '12.50',
          impressions: '400',
          clicks: '20',
          actions: [],
        },
      ],
    };
  }
  if (method === 'GET') {
    return { effective_status: 'PAUSED', id: path };
  }
  const key = `${path}:${body?.name ?? body?.status ?? 'create'}`;
  const existing = mockIds.get(key);
  const id = existing ?? `mock_${mockIds.size + 1}`;
  mockIds.set(key, id);
  if (path.endsWith('/adimages')) return { images: { bytes: { hash: 'mockhash' } } };
  return { id };
}
