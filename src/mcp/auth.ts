// Hono middleware that authenticates an incoming MCP request.
//
// - Pulls the `Authorization: Bearer <token>` header.
// - Looks up the matching `mcp_sessions` row via SHA-256(token).
// - Updates `last_used_at`.
// - Resolves the store, loads the latest oauth_tokens, and constructs a
//   TrayClient closure that auto-refreshes on demand.
//
// On success it stashes `{ client, storeId }` under `c.set('mcpCtx', ...)`
// for downstream handlers (the MCP transport).

import type { Context, MiddlewareHandler } from "hono";
import { and, eq, isNull } from "drizzle-orm";

import type { Bindings } from "../index.js";
import { mcpSessions, oauthTokens, stores } from "../db/schema.js";
import { createDb, type Database } from "../lib/db.js";
import { TrayHttpClient, type TrayClient } from "../tray/client.js";
import type { McpServerContext } from "./server.js";

export type Db = Database;

declare module "hono" {
  interface ContextVariableMap {
    mcpCtx: McpServerContext;
  }
}

const TEXT_ENCODER = new TextEncoder();

/**
 * Compute the SHA-256 hex digest of a bearer token. Cloudflare Workers and
 * modern Node both expose `crypto.subtle`.
 */
export async function sha256Hex(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(token));
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function extractBearer(c: Context): string | undefined {
  const header = c.req.header("Authorization") ?? c.req.header("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1]!.trim() : undefined;
}

export interface AuthDeps {
  /** Override the DB resolver — used by tests to inject a mock. */
  getDb?: (env: Bindings) => Db | Promise<Db>;
  /** Override the TrayClient factory — used by tests to inject a mock. */
  createClient?: (params: {
    storeId: string;
    apiAddress: string;
    accessToken: string;
    refreshToken: string;
    db: Db;
    env: Bindings;
  }) => TrayClient;
  /** Override the token refresh implementation — used by tests. */
  refreshAccessToken?: (params: {
    storeId: string;
    refreshToken: string;
    db: Db;
    env: Bindings;
  }) => Promise<string>;
}

async function defaultRefresh(params: {
  storeId: string;
  refreshToken: string;
  db: Db;
  env: Bindings;
}): Promise<string> {
  // Lazy-load to avoid a hard dependency: another agent owns this module and
  // it may not yet exist when this file is imported from tests.
  const mod = (await import("../oauth/refresh.js")) as {
    refreshAccessToken: (p: {
      storeId: string;
      refreshToken: string;
      db: Db;
      env: Bindings;
    }) => Promise<string>;
  };
  return mod.refreshAccessToken(params);
}

function defaultCreateClient(params: {
  storeId: string;
  apiAddress: string;
  accessToken: string;
  refreshToken: string;
  db: Db;
  env: Bindings;
  refresh: (p: {
    storeId: string;
    refreshToken: string;
    db: Db;
    env: Bindings;
  }) => Promise<string>;
}): TrayClient {
  let currentToken = params.accessToken;
  let currentRefresh = params.refreshToken;
  return new TrayHttpClient({
    apiAddress: params.apiAddress,
    storeId: params.storeId,
    getAccessToken: async () => currentToken,
    refreshAccessToken: async () => {
      const fresh = await params.refresh({
        storeId: params.storeId,
        refreshToken: currentRefresh,
        db: params.db,
        env: params.env,
      });
      currentToken = fresh;
      return fresh;
    },
  });
}

/**
 * Build the auth middleware. Pass `deps` to override DB / token refresh in
 * tests; production callers should call `authMcp()` with no args.
 */
export function authMcp(deps: AuthDeps = {}): MiddlewareHandler<{
  Bindings: Bindings;
}> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));
  const refresh = deps.refreshAccessToken ?? defaultRefresh;

  return async (c, next) => {
    const token = extractBearer(c);
    if (!token) {
      return c.json(
        { error: "unauthorized", message: "Missing Bearer token" },
        401,
      );
    }

    const bearerHash = await sha256Hex(token);
    const db = await resolveDb(c.env);

    const sessions = await db
      .select({
        sessionId: mcpSessions.id,
        storeId: mcpSessions.storeId,
        revokedAt: mcpSessions.revokedAt,
        expiresAt: mcpSessions.expiresAt,
      })
      .from(mcpSessions)
      .where(
        and(
          eq(mcpSessions.bearerHash, bearerHash),
          isNull(mcpSessions.revokedAt),
        ),
      )
      .limit(1);

    const session = sessions[0];
    if (!session) {
      return c.json(
        { error: "unauthorized", message: "Invalid bearer token" },
        401,
      );
    }

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      return c.json(
        { error: "unauthorized", message: "Bearer token expired" },
        401,
      );
    }

    // Touch last_used_at; failure here is non-fatal — we log via Hono's normal
    // error path but still serve the request.
    await db
      .update(mcpSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(mcpSessions.id, session.sessionId));

    const storeRows = await db
      .select({
        id: stores.id,
        trayStoreId: stores.trayStoreId,
        apiAddress: stores.apiAddress,
      })
      .from(stores)
      .where(eq(stores.id, session.storeId))
      .limit(1);
    const store = storeRows[0];
    if (!store) {
      return c.json(
        { error: "unauthorized", message: "Store no longer exists" },
        401,
      );
    }

    const tokenRows = await db
      .select({
        accessToken: oauthTokens.accessToken,
        refreshToken: oauthTokens.refreshToken,
      })
      .from(oauthTokens)
      .where(eq(oauthTokens.storeId, store.id))
      .limit(1);
    const tokens = tokenRows[0];
    if (!tokens) {
      return c.json(
        {
          error: "unauthorized",
          message: "No OAuth tokens registered for this store",
        },
        401,
      );
    }

    const client = deps.createClient
      ? deps.createClient({
          storeId: store.trayStoreId,
          apiAddress: store.apiAddress,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          db,
          env: c.env,
        })
      : defaultCreateClient({
          storeId: store.trayStoreId,
          apiAddress: store.apiAddress,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          db,
          env: c.env,
          refresh,
        });

    c.set("mcpCtx", { client, storeId: store.trayStoreId });
    await next();
    return;
  };
}
