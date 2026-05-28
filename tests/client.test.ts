import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './setup.js';
import {
  TrayAuthError,
  TrayHttpClient,
} from '../src/tray/client.js';

const API_ADDRESS = 'https://loja123.commercesuite.com.br';
const BASE = `${API_ADDRESS}/web_api`;

function makeClient(overrides: Partial<ConstructorParameters<typeof TrayHttpClient>[0]> = {}) {
  const getAccessToken = overrides.getAccessToken ?? vi.fn(async () => 'access-token-original');
  const refreshAccessToken = overrides.refreshAccessToken ?? vi.fn(async () => 'access-token-refreshed');
  // Provide a sleep override so we can drive timers in retry tests.
  const sleep =
    overrides.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const client = new TrayHttpClient({
    apiAddress: API_ADDRESS,
    getAccessToken,
    refreshAccessToken,
    sleep,
    ...overrides,
  });

  return { client, getAccessToken, refreshAccessToken };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TrayHttpClient', () => {
  it('returns JSON on successful GET', async () => {
    server.use(
      http.get(`${BASE}/customers`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('access_token')).toBe('access-token-original');
        return HttpResponse.json({ Customers: [{ id: 1 }] });
      }),
    );

    const { client } = makeClient();
    const result = await client.request('GET', '/customers');
    expect(result).toEqual({ Customers: [{ id: 1 }] });
  });

  it('does not double the /web_api segment when api_address already includes it', async () => {
    // Tray's OAuth callback returns api_address ending in /web_api. The client
    // must not append a second /web_api — Tray 404s PUT on the doubled path.
    let requestedPath: string | undefined;
    server.use(
      http.put(`${BASE}/categories/523`, async ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({ message: 'Saved', code: 200, id: '523' });
      }),
    );

    const { client } = makeClient({ apiAddress: BASE });
    const result = await client.request('PUT', '/categories/523', {
      body: { Category: { description: '<p>x</p>' } },
    });

    expect(result).toEqual({ message: 'Saved', code: 200, id: '523' });
    expect(requestedPath).toBe('/web_api/categories/523');
    expect(requestedPath).not.toContain('/web_api/web_api');
  });

  it('sends POST with JSON body and Content-Type header', async () => {
    let observed: { contentType: string | null; body: unknown; tokenParam: string | null } | undefined;

    server.use(
      http.post(`${BASE}/customers`, async ({ request }) => {
        observed = {
          contentType: request.headers.get('content-type'),
          body: await request.json(),
          tokenParam: new URL(request.url).searchParams.get('access_token'),
        };
        // Ensure no Authorization header is being set.
        expect(request.headers.get('authorization')).toBeNull();
        return HttpResponse.json({ Customer: { id: 99 } }, { status: 201 });
      }),
    );

    const { client } = makeClient();
    const result = await client.request('POST', '/customers', {
      body: { Customer: { name: 'Alice' } },
    });

    expect(result).toEqual({ Customer: { id: 99 } });
    expect(observed?.contentType).toMatch(/application\/json/);
    expect(observed?.body).toEqual({ Customer: { name: 'Alice' } });
    expect(observed?.tokenParam).toBe('access-token-original');
  });

  it('retries with exponential backoff on 429 and eventually succeeds', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/products`, () => {
        calls += 1;
        if (calls < 3) {
          return HttpResponse.json({ error: 'rate limited' }, { status: 429 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );

    const sleeps: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      sleeps.push(ms);
    });

    const { client } = makeClient({ sleep });
    const result = await client.request('GET', '/products');

    expect(result).toEqual({ ok: true });
    expect(calls).toBe(3);
    // Two retries (first two attempts returned 429), backoff schedule [250, 1000, 4000].
    expect(sleeps).toEqual([250, 1000]);
  });

  it('refreshes the access token on 401 with refreshable error_code and retries', async () => {
    let calls = 0;
    let lastToken: string | null = null;
    server.use(
      http.get(`${BASE}/orders`, ({ request }) => {
        calls += 1;
        lastToken = new URL(request.url).searchParams.get('access_token');
        if (calls === 1) {
          return HttpResponse.json(
            { error: 'token expired', error_code: 1000 },
            { status: 401 },
          );
        }
        return HttpResponse.json({ Orders: [] });
      }),
    );

    const { client, refreshAccessToken } = makeClient();
    const result = await client.request('GET', '/orders');

    expect(result).toEqual({ Orders: [] });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
    expect(lastToken).toBe('access-token-refreshed');
  });

  it('throws TrayAuthError when 401 persists after refresh', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/orders`, () => {
        calls += 1;
        return HttpResponse.json(
          { error: 'invalid token', error_code: 1099 },
          { status: 401 },
        );
      }),
    );

    const { client, refreshAccessToken } = makeClient();

    await expect(client.request('GET', '/orders')).rejects.toBeInstanceOf(TrayAuthError);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });

  it('does not send access_token as a header — only as query param', async () => {
    let headerToken: string | null = null;
    let queryToken: string | null = null;
    server.use(
      http.get(`${BASE}/info`, ({ request }) => {
        headerToken =
          request.headers.get('authorization') ?? request.headers.get('access-token');
        queryToken = new URL(request.url).searchParams.get('access_token');
        return HttpResponse.json({ ok: true });
      }),
    );

    const { client } = makeClient();
    await client.request('GET', '/info');

    expect(headerToken).toBeNull();
    expect(queryToken).toBe('access-token-original');
  });
});
