import { eq } from "drizzle-orm";
import { z } from "zod";

import { oauthTokens, stores } from "../db/schema.js";
import type { Database } from "../lib/db.js";

import { parseTrayDate } from "./callback.js";

/**
 * How close to expiration we trigger a proactive refresh (10 minutes).
 */
export const REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Tray's `GET /auth?refresh_token=...` response. Same shape as the
 * initial code-exchange but `store_id` may be omitted; we don't need it
 * for refresh because we already know the store.
 */
const refreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  date_expiration_access_token: z.string(),
  date_expiration_refresh_token: z.string(),
});

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

/**
 * Internal: load the active store + token rows for `storeId`.
 */
async function loadStoreAndToken(db: Database, storeId: string) {
  const storeRows = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  const store = storeRows[0];
  if (!store) {
    throw new Error(`store not found: ${storeId}`);
  }

  const tokenRows = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.storeId, storeId))
    .limit(1);
  const token = tokenRows[0];
  if (!token) {
    throw new Error(`no oauth_tokens row for store ${storeId}`);
  }

  return { store, token };
}

/**
 * Hit Tray's refresh endpoint and persist the result. Returns the new
 * token row.
 */
export async function refreshTokens(
  db: Database,
  storeId: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<RefreshedTokens> {
  const { store, token } = await loadStoreAndToken(db, storeId);
  const fetchImpl = options?.fetchImpl ?? fetch;

  const url = `${store.apiAddress.replace(/\/$/, "")}/auth?refresh_token=${encodeURIComponent(
    token.refreshToken,
  )}`;

  const res = await fetchImpl(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Tray /auth refresh failed: ${res.status} ${res.statusText} — ${text}`,
    );
  }

  const json = (await res.json()) as unknown;
  const parsed = refreshResponseSchema.parse(json);

  const accessExpiresAt = parseTrayDate(parsed.date_expiration_access_token);
  const refreshExpiresAt = parseTrayDate(parsed.date_expiration_refresh_token);

  await db
    .update(oauthTokens)
    .set({
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      accessExpiresAt,
      refreshExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(oauthTokens.storeId, storeId));

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Return a valid access token for `storeId`, refreshing transparently if
 * the current one is within `REFRESH_THRESHOLD_MS` of expiry.
 */
export async function getValidAccessToken(
  db: Database,
  storeId: string,
  options?: { now?: Date; fetchImpl?: typeof fetch },
): Promise<string> {
  const { token } = await loadStoreAndToken(db, storeId);
  const now = options?.now ?? new Date();
  const remaining = token.accessExpiresAt.getTime() - now.getTime();

  if (remaining > REFRESH_THRESHOLD_MS) {
    return token.accessToken;
  }

  const refreshed = await refreshTokens(db, storeId, {
    fetchImpl: options?.fetchImpl,
  });
  return refreshed.accessToken;
}

/**
 * Adapter used by the MCP transport layer. Unconditionally refreshes
 * (the caller has already decided the current token is unusable) and
 * returns just the new access token string.
 *
 * The `refreshToken` argument is accepted for API compatibility but the
 * canonical value is read from the DB inside `refreshTokens`.
 */
export async function refreshAccessToken(params: {
  storeId: string;
  refreshToken: string;
  db: Database;
  // The MCP code passes its Bindings here so a per-env fetch can be
  // injected in the future; we accept and ignore for now.
  env?: unknown;
}): Promise<string> {
  const refreshed = await refreshTokens(params.db, params.storeId);
  return refreshed.accessToken;
}
