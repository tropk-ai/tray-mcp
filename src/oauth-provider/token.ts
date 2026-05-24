// POST /token — final step of the OAuth 2.1 authorization code flow.
//
// Two grant types supported:
//   - `authorization_code` + PKCE: validates the verifier against the
//     stored `code_challenge` (S256), marks the pending row consumed,
//     and issues an MCP bearer access token + refresh token. The bearer
//     is stored hashed (sha256) in `mcp_sessions` so `authMcp` can
//     verify it directly.
//   - `refresh_token`: rotates a refresh token, issuing a fresh bearer
//     bound to the same store.

import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import { mcpSessions, oauthPending } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";

import { pkceS256, randomHex, sha256Hex } from "./util.js";

/**
 * Refresh tokens live for 30 days; access tokens for 1 hour.
 */
export const ACCESS_TOKEN_TTL_SEC = 60 * 60;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

const codeGrantSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  redirect_uri: z.string().url(),
  client_id: z.string().min(1),
  code_verifier: z.string().min(43).max(128),
});

const refreshGrantSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
});

const tokenBodySchema = z.union([codeGrantSchema, refreshGrantSchema]);

export interface TokenDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
}

interface TokenSuccess {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope?: string;
}

interface IssuedPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Mint a fresh (access, refresh) pair, persist their sha256 digests in
 * `mcp_sessions` (one row each — refresh tokens are stored with a
 * "refresh" label and a longer TTL), and return the plaintext values.
 */
async function issueTokens(params: {
  db: Database;
  storeId: string;
  label: string;
}): Promise<IssuedPair> {
  const accessToken = `mcp_at_${randomHex(32)}`;
  const refreshToken = `mcp_rt_${randomHex(32)}`;
  const now = new Date();
  const accessExpires = new Date(now.getTime() + ACCESS_TOKEN_TTL_SEC * 1000);
  const refreshExpires = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);

  const accessHash = await sha256Hex(accessToken);
  const refreshHash = await sha256Hex(refreshToken);

  await params.db.insert(mcpSessions).values({
    storeId: params.storeId,
    bearerHash: accessHash,
    label: params.label,
    expiresAt: accessExpires,
  });
  await params.db.insert(mcpSessions).values({
    storeId: params.storeId,
    bearerHash: refreshHash,
    label: `${params.label} (refresh)`,
    expiresAt: refreshExpires,
  });

  return { accessToken, refreshToken, expiresAt: accessExpires };
}

/**
 * Parse a /token POST body. Accepts both `application/json` and
 * `application/x-www-form-urlencoded` per RFC 6749.
 */
async function readBody(c: Context): Promise<Record<string, string>> {
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return (await c.req.json()) as Record<string, string>;
  }
  const form = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function tokenHandler(
  deps: TokenDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));

  return async (c) => {
    let raw: Record<string, string>;
    try {
      raw = await readBody(c);
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }
    const parsed = tokenBodySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", error_description: parsed.error.message },
        400,
      );
    }

    const db = await resolveDb(c.env);

    if (parsed.data.grant_type === "authorization_code") {
      return handleAuthCode(c, db, parsed.data);
    }
    return handleRefresh(c, db, parsed.data);
  };
}

async function handleAuthCode(
  c: Context<{ Bindings: Bindings }>,
  db: Database,
  body: z.infer<typeof codeGrantSchema>,
): Promise<Response> {
  const rows = await db
    .select()
    .from(oauthPending)
    .where(eq(oauthPending.mcpCode, body.code))
    .limit(1);
  const pending = rows[0];
  if (!pending) {
    return c.json({ error: "invalid_grant", error_description: "unknown code" }, 400);
  }
  if (pending.consumedAt) {
    return c.json({ error: "invalid_grant", error_description: "code already used" }, 400);
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    return c.json({ error: "invalid_grant", error_description: "code expired" }, 400);
  }
  if (pending.clientId !== body.client_id) {
    return c.json({ error: "invalid_grant", error_description: "client mismatch" }, 400);
  }
  if (pending.redirectUri !== body.redirect_uri) {
    return c.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      400,
    );
  }
  if (!pending.storeId) {
    return c.json(
      { error: "invalid_grant", error_description: "store not bound to code" },
      400,
    );
  }

  // Validate PKCE.
  const expected = await pkceS256(body.code_verifier);
  if (expected !== pending.codeChallenge) {
    return c.json(
      { error: "invalid_grant", error_description: "PKCE verifier mismatch" },
      400,
    );
  }

  // Mark the pending row consumed BEFORE issuing the tokens so a
  // concurrent request can't double-spend the code.
  await db
    .update(oauthPending)
    .set({ consumedAt: new Date() })
    .where(eq(oauthPending.id, pending.id));

  const issued = await issueTokens({
    db,
    storeId: pending.storeId,
    label: `client=${pending.clientId}`,
  });

  const response: TokenSuccess = {
    access_token: issued.accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: issued.refreshToken,
    ...(pending.scope ? { scope: pending.scope } : {}),
  };
  return c.json(response, 200);
}

async function handleRefresh(
  c: Context<{ Bindings: Bindings }>,
  db: Database,
  body: z.infer<typeof refreshGrantSchema>,
): Promise<Response> {
  const hash = await sha256Hex(body.refresh_token);
  const rows = await db
    .select({
      sessionId: mcpSessions.id,
      storeId: mcpSessions.storeId,
      expiresAt: mcpSessions.expiresAt,
    })
    .from(mcpSessions)
    .where(
      and(eq(mcpSessions.bearerHash, hash), isNull(mcpSessions.revokedAt)),
    )
    .limit(1);
  const session = rows[0];
  if (!session) {
    return c.json(
      { error: "invalid_grant", error_description: "unknown refresh token" },
      400,
    );
  }
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    return c.json(
      { error: "invalid_grant", error_description: "refresh token expired" },
      400,
    );
  }

  // Revoke the old refresh token (rotation) and mint a fresh pair.
  await db
    .update(mcpSessions)
    .set({ revokedAt: new Date() })
    .where(eq(mcpSessions.id, session.sessionId));

  const issued = await issueTokens({
    db,
    storeId: session.storeId,
    label: `client=${body.client_id}`,
  });

  const response: TokenSuccess = {
    access_token: issued.accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    refresh_token: issued.refreshToken,
  };
  return c.json(response, 200);
}
