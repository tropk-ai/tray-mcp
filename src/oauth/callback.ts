import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import { mcpSessions, oauthTokens, stores } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";

/**
 * Query params that Tray appends when redirecting back to us after the
 * merchant authorizes the app on `/auth.php`.
 */
const callbackQuerySchema = z.object({
  code: z.string().min(1),
  adm_user: z.string().optional(),
  store: z.string().optional(),
  api_address: z.string().url(),
});

/**
 * Shape of Tray's token exchange response. Tray returns timestamps as
 * `YYYY-MM-DD HH:mm:ss` strings (server local time).
 */
const tokenResponseSchema = z.object({
  code: z.number().optional(),
  access_token: z.string(),
  refresh_token: z.string(),
  date_expiration_access_token: z.string(),
  date_expiration_refresh_token: z.string(),
  date_activated: z.string().optional(),
  api_host: z.string().optional(),
  store_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export type TrayTokenResponse = z.infer<typeof tokenResponseSchema>;

/**
 * Parse a `YYYY-MM-DD HH:mm:ss` string returned by Tray into a Date.
 * Tray timestamps are in São Paulo time but we store them as-is; the
 * server typically runs in UTC so we treat the value as UTC. This is
 * good enough for the 10-minute refresh threshold.
 */
export function parseTrayDate(value: string): Date {
  // Append a `Z` so JS parses as UTC instead of local time.
  const iso = value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid Tray timestamp: ${value}`);
  }
  return d;
}

/**
 * Exchange the authorization `code` for an access/refresh token pair by
 * POSTing to `${api_address}/auth`.
 *
 * The `fetchImpl` parameter exists so tests can inject a mock without
 * monkey-patching the global `fetch`.
 */
export async function exchangeCodeForTokens(params: {
  apiAddress: string;
  consumerKey: string;
  consumerSecret: string;
  code: string;
  fetchImpl?: typeof fetch;
}): Promise<TrayTokenResponse> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    consumer_key: params.consumerKey,
    consumer_secret: params.consumerSecret,
    code: params.code,
  });

  const res = await fetchImpl(`${params.apiAddress.replace(/\/$/, "")}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Tray /auth exchange failed: ${res.status} ${res.statusText} — ${text}`,
    );
  }

  const json = (await res.json()) as unknown;
  return tokenResponseSchema.parse(json);
}

/**
 * Generate a fresh MCP bearer token. Format: `mcp_<uuid>_<32 random bytes hex>`.
 * Returns both the plaintext bearer (shown once) and its bcrypt hash.
 */
export async function generateBearer(): Promise<{
  plaintext: string;
  hash: string;
}> {
  const uuid = crypto.randomUUID();
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  const plaintext = `mcp_${uuid}_${hex}`;
  const hash = await bcrypt.hash(plaintext, 10);
  return { plaintext, hash };
}

/**
 * Result of a successful install: ids needed to render the success page.
 */
export interface CallbackResult {
  storeId: string;
  sessionId: string;
  bearer: string;
}

/**
 * Core install logic, decoupled from Hono so it can be unit-tested with
 * a fake DB and a fake `fetch`.
 *
 * Steps:
 *   1. Exchange the code for tokens via Tray's `/auth`.
 *   2. Upsert the `stores` row (keyed on `tray_store_id`).
 *   3. Upsert the `oauth_tokens` row for that store.
 *   4. Generate a new MCP bearer, persist its bcrypt hash in
 *      `mcp_sessions`, and return the plaintext bearer to the caller
 *      (it is then shown to the merchant exactly once).
 */
export async function completeInstall(params: {
  db: Database;
  apiAddress: string;
  code: string;
  consumerKey: string;
  consumerSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<CallbackResult> {
  const tokenRes = await exchangeCodeForTokens({
    apiAddress: params.apiAddress,
    consumerKey: params.consumerKey,
    consumerSecret: params.consumerSecret,
    code: params.code,
    fetchImpl: params.fetchImpl,
  });

  const accessExpiresAt = parseTrayDate(tokenRes.date_expiration_access_token);
  const refreshExpiresAt = parseTrayDate(
    tokenRes.date_expiration_refresh_token,
  );

  // Upsert store keyed on tray_store_id.
  const storeRows = await params.db
    .insert(stores)
    .values({
      trayStoreId: tokenRes.store_id,
      apiAddress: params.apiAddress,
    })
    .onConflictDoUpdate({
      target: stores.trayStoreId,
      set: {
        apiAddress: params.apiAddress,
        updatedAt: new Date(),
      },
    })
    .returning();

  const store = storeRows[0];
  if (!store) {
    throw new Error("failed to upsert store row");
  }

  // Upsert tokens — there is no unique constraint on store_id, so we
  // emulate the upsert: delete prior rows, then insert. This keeps the
  // table to one active row per store.
  await params.db.delete(oauthTokens).where(eq(oauthTokens.storeId, store.id));
  await params.db.insert(oauthTokens).values({
    storeId: store.id,
    accessToken: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token,
    accessExpiresAt,
    refreshExpiresAt,
  });

  // Mint a new MCP bearer.
  const { plaintext, hash } = await generateBearer();
  const sessionRows = await params.db
    .insert(mcpSessions)
    .values({
      storeId: store.id,
      bearerHash: hash,
      label: "Issued at install",
    })
    .returning();

  const session = sessionRows[0];
  if (!session) {
    throw new Error("failed to create mcp_sessions row");
  }

  return {
    storeId: store.id,
    sessionId: session.id,
    bearer: plaintext,
  };
}

/**
 * Hono handler. Validates the query, runs `completeInstall`, and
 * redirects to `/install-success` with the freshly minted bearer in
 * the URL (one-time display).
 */
export async function callbackHandler(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const parsed = callbackQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid_request",
        message: parsed.error.message,
      },
      400,
    );
  }

  const { code, api_address } = parsed.data;
  const db = createDb(c.env.DATABASE_URL);

  try {
    const result = await completeInstall({
      db,
      apiAddress: api_address,
      code,
      consumerKey: c.env.TRAY_CONSUMER_KEY,
      consumerSecret: c.env.TRAY_CONSUMER_SECRET,
    });

    const url =
      `/install-success?session_id=${encodeURIComponent(result.sessionId)}` +
      `&token=${encodeURIComponent(result.bearer)}`;
    return c.redirect(url, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json(
      {
        error: "install_failed",
        message,
      },
      502,
    );
  }
}
