// Tray Commerce HTTP API client.
//
// Features:
// - Builds requests against `${apiAddress}/web_api${path}` with access_token query param.
// - Retries with exponential backoff on 429, 5xx, and network errors (up to 3 attempts).
// - Auto-refreshes the access token once on auth-related 401 responses.
// - Emits structured JSON logs without leaking tokens or full bodies.

import { RateLimiter } from './rate-limiter.js';

export interface TrayClient {
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts?: { query?: Record<string, unknown>; body?: unknown; accessToken?: string },
  ): Promise<T>;
}

export interface TrayHttpClientOptions {
  apiAddress: string;
  getAccessToken: () => Promise<string>;
  refreshAccessToken: () => Promise<string>;
  rateLimiter?: RateLimiter;
  /** Optional store identifier for the rate limiter (defaults to apiAddress). */
  storeId?: string;
  /** Override fetch (used by tests / runtimes that don't expose global fetch). */
  fetchImpl?: typeof fetch;
  /** Override sleep (used by tests with fake timers). */
  sleep?: (ms: number) => Promise<void>;
  /** Max retries for retryable errors (429, 5xx, network). Default 3. */
  maxRetries?: number;
  /** Backoff schedule in ms (one entry per retry attempt). */
  backoffMs?: readonly number[];
}

const DEFAULT_BACKOFF_MS = [250, 1000, 4000] as const;

/** Auth-related Tray error codes that justify a token refresh. */
const REFRESH_ELIGIBLE_AUTH_CODES = new Set([1000, 1001, 1002, 1003, 1099]);

export class TrayApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code: number | undefined;

  constructor(message: string, status: number, body: unknown, code?: number) {
    super(message);
    this.name = 'TrayApiError';
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export class TrayAuthError extends TrayApiError {
  constructor(message: string, status: number, body: unknown, code?: number) {
    super(message, status, body, code);
    this.name = 'TrayAuthError';
  }
}

export class TrayRateLimitError extends TrayApiError {
  constructor(message: string, status: number, body: unknown, code?: number) {
    super(message, status, body, code);
    this.name = 'TrayRateLimitError';
  }
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class TrayHttpClient implements TrayClient {
  private readonly apiAddress: string;
  private readonly getAccessToken: () => Promise<string>;
  private readonly refreshAccessToken: () => Promise<string>;
  private readonly rateLimiter: RateLimiter | undefined;
  private readonly storeId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  private readonly backoffMs: readonly number[];

  constructor(opts: TrayHttpClientOptions) {
    // Tray's OAuth callback returns `api_address` already ending in `/web_api`
    // (e.g. `https://loja.commercesuite.com.br/web_api`). buildUrl appends
    // `/web_api` itself, so we strip a trailing `/web_api` here to avoid a
    // doubled `/web_api/web_api/...` path. Tray's GET routing tolerates the
    // doubled segment but PUT/POST/DELETE return 404, which silently broke all
    // writes. Normalizing both accepted forms (host or host+/web_api) keeps the
    // base canonical regardless of caller.
    this.apiAddress = opts.apiAddress.replace(/\/+$/, '').replace(/\/web_api$/i, '');
    this.getAccessToken = opts.getAccessToken;
    this.refreshAccessToken = opts.refreshAccessToken;
    this.rateLimiter = opts.rateLimiter;
    this.storeId = opts.storeId ?? this.apiAddress;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.sleep = opts.sleep ?? defaultSleep;
    this.maxRetries = opts.maxRetries ?? 3;
    this.backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF_MS;
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown; accessToken?: string } = {},
  ): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const token = opts.accessToken ?? (await this.getAccessToken());
    return this.doRequest<T>(method, normalizedPath, opts, token, /*refreshed*/ false);
  }

  private async doRequest<T>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown },
    token: string,
    alreadyRefreshed: boolean,
  ): Promise<T> {
    const url = this.buildUrl(path, token, opts.query);

    const headers: Record<string, string> = { Accept: 'application/json' };
    let bodyInit: BodyInit | undefined;
    if (opts.body !== undefined && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      bodyInit = JSON.stringify(opts.body);
    }

    let lastError: unknown;
    let retries = 0;
    const startedAt = Date.now();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (this.rateLimiter) {
        await this.rateLimiter.acquire(this.storeId);
      }

      let response: Response | undefined;
      try {
        response = await this.fetchImpl(url, { method, headers, body: bodyInit });
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          retries += 1;
          await this.sleep(this.backoffMs[attempt] ?? this.backoffMs[this.backoffMs.length - 1]!);
          continue;
        }
        this.logFailure(method, path, undefined, Date.now() - startedAt, retries, 'network');
        throw err;
      }

      const status = response.status;

      if (status >= 200 && status < 300) {
        const parsed = await this.safeParseJson(response);
        this.logSuccess(method, path, status, Date.now() - startedAt, retries);
        return parsed as T;
      }

      const parsedBody = await this.safeParseJson(response);
      const code = extractErrorCode(parsedBody);

      if (status === 401) {
        if (!alreadyRefreshed && (code === undefined || REFRESH_ELIGIBLE_AUTH_CODES.has(code))) {
          this.logRetry(method, path, status, Date.now() - startedAt, retries, 'refresh');
          const newToken = await this.refreshAccessToken();
          return this.doRequest<T>(method, path, opts, newToken, true);
        }
        this.logFailure(method, path, status, Date.now() - startedAt, retries, 'auth');
        throw new TrayAuthError(
          `Tray API auth failed (status ${status}, code ${code ?? 'unknown'})`,
          status,
          parsedBody,
          code,
        );
      }

      if (status === 429 || status >= 500) {
        if (attempt < this.maxRetries) {
          retries += 1;
          await this.sleep(this.backoffMs[attempt] ?? this.backoffMs[this.backoffMs.length - 1]!);
          continue;
        }
        this.logFailure(method, path, status, Date.now() - startedAt, retries, 'retryable');
        if (status === 429) {
          throw new TrayRateLimitError(
            `Tray API rate-limited (status ${status})`,
            status,
            parsedBody,
            code,
          );
        }
        throw new TrayApiError(
          `Tray API server error (status ${status})`,
          status,
          parsedBody,
          code,
        );
      }

      // Non-retryable client error (4xx other than 401/429).
      this.logFailure(method, path, status, Date.now() - startedAt, retries, 'client');
      throw new TrayApiError(
        `Tray API error (status ${status}, code ${code ?? 'unknown'})`,
        status,
        parsedBody,
        code,
      );
    }

    // Should be unreachable; provide a sane fallback.
    throw lastError instanceof Error ? lastError : new Error('Tray client exhausted retries');
  }

  private buildUrl(path: string, token: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.apiAddress}/web_api${path}`);
    url.searchParams.set('access_token', token);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async safeParseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private logSuccess(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    retries: number,
  ): void {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ level: 'info', event: 'tray_request', method, path, status, duration_ms: durationMs, retries }),
    );
  }

  private logRetry(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    retries: number,
    reason: string,
  ): void {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: 'tray_request_retry',
        method,
        path,
        status,
        duration_ms: durationMs,
        retries,
        reason,
      }),
    );
  }

  private logFailure(
    method: string,
    path: string,
    status: number | undefined,
    durationMs: number,
    retries: number,
    reason: string,
  ): void {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: 'warn',
        event: 'tray_request_failed',
        method,
        path,
        status,
        duration_ms: durationMs,
        retries,
        reason,
      }),
    );
  }
}

function extractErrorCode(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  const raw = obj['error_code'] ?? obj['code'];
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return undefined;
}
