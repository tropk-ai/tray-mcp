// GET /oauth/tray-callback — Tray redirects here after the merchant
// authorizes the app at https://{store}/auth.php. The query params are
// the same as the legacy /oauth/callback flow, plus our own `pending`
// id that links this redirect to the in-flight OAuth-provider session.
//
// We exchange the Tray `code` for tokens (reusing `completeInstall`
// from the legacy flow), then mint an `mcp_code` and redirect back to
// the original OAuth client's redirect_uri.

import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import { oauthPending } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";
import { completeInstall } from "../oauth/callback.js";

import { appendQuery, randomHex } from "./util.js";

const querySchema = z.object({
  code: z.string().min(1),
  adm_user: z.string().optional(),
  store: z.string().optional(),
  api_address: z.string().url(),
  pending: z.string().min(1),
});

export interface TrayCallbackDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
  /** Override the install logic — used by tests. */
  installFn?: typeof completeInstall;
  /** Override the fetch used by `completeInstall` (production). */
  fetchImpl?: typeof fetch;
}

export function trayCallbackHandler(
  deps: TrayCallbackDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));
  const install = deps.installFn ?? completeInstall;

  return async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", error_description: parsed.error.message },
        400,
      );
    }

    const db = await resolveDb(c.env);

    // Load the pending row this Tray redirect refers to.
    const pendingRows = await db
      .select()
      .from(oauthPending)
      .where(eq(oauthPending.id, parsed.data.pending))
      .limit(1);
    const pending = pendingRows[0];
    if (!pending) {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (pending.consumedAt) {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      return c.json({ error: "invalid_request" }, 400);
    }

    // Exchange the Tray code for tokens and persist them.
    let result;
    try {
      result = await install({
        db,
        apiAddress: parsed.data.api_address,
        code: parsed.data.code,
        consumerKey: c.env.TRAY_CONSUMER_KEY,
        consumerSecret: c.env.TRAY_CONSUMER_SECRET,
        fetchImpl: deps.fetchImpl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: "server_error", error_description: message }, 502);
    }

    // Mint a one-shot MCP authorization code. The PKCE check + bearer
    // mint happen on POST /token; we only store the code → store_id link
    // and the still-unconsumed verifier hash.
    const mcpCode = `mcpc_${randomHex(32)}`;
    await db
      .update(oauthPending)
      .set({
        mcpCode,
        storeId: result.storeId,
      })
      .where(eq(oauthPending.id, parsed.data.pending));

    // Redirect back to claude.ai's redirect_uri carrying the code+state.
    const redirect = appendQuery(pending.redirectUri, {
      code: mcpCode,
      state: pending.state,
    });
    return c.redirect(redirect, 302);
  };
}
