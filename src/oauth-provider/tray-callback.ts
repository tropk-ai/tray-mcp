// GET /oauth/tray-callback — Tray redirects here after the merchant
// authorizes the app at https://{store}/auth.php. The query params are
// the same as the legacy /oauth/callback flow, plus our own `pending`
// id that links this redirect to the in-flight OAuth-provider session.
//
// We exchange the Tray `code` for tokens (reusing `completeInstall`
// from the legacy flow), then mint an `mcp_code` and redirect back to
// the original OAuth client's redirect_uri.

import { eq, like } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import { oauthPending, oauthTokens, stores } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";
import { completeInstall } from "../oauth/callback.js";

import { appendQuery, randomHex } from "./util.js";

// `code` + `api_address` come from Tray's redirect query string. `pending`
// is our own id and travels in the URL path (see buildTrayAuthorizeUrl) so
// that Tray can append its query params to a callback with no `?` of its own.
const querySchema = z.object({
  code: z.string().min(1),
  adm_user: z.string().optional(),
  store: z.string().optional(),
  api_address: z.string().url(),
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
    const pendingId = c.req.param("pending");
    if (!pendingId) {
      return c.json(
        { error: "invalid_request", error_description: "missing pending id" },
        400,
      );
    }

    const parsed = querySchema.safeParse(c.req.query());
    const db = await resolveDb(c.env);

    // Load the pending row this Tray redirect refers to.
    const pendingRows = await db
      .select()
      .from(oauthPending)
      .where(eq(oauthPending.id, pendingId))
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

    // Resolve which store this authorization is for.
    let storeId: string;
    if (parsed.success) {
      // Tray returned a fresh `code` — exchange it for tokens and persist.
      try {
        const result = await install({
          db,
          apiAddress: parsed.data.api_address,
          code: parsed.data.code,
          consumerKey: c.env.TRAY_CONSUMER_KEY,
          consumerSecret: c.env.TRAY_CONSUMER_SECRET,
          fetchImpl: deps.fetchImpl,
        });
        storeId = result.storeId;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json(
          { error: "server_error", error_description: message },
          502,
        );
      }
    } else {
      // Tray omitted `code`/`api_address`. This happens when the app is
      // already installed on the store (Tray's "manual code" mode redirects
      // back with no params). Fall back to the store already connected for
      // the domain the merchant selected on the picker.
      const domain = pending.trayStore;

      // Primary: match a connected store whose api_address contains the
      // domain the merchant selected (works when the stored api_address and
      // the /auth.php domain are the same host).
      let resolvedStoreId: string | undefined;
      if (domain) {
        const byDomain = await db
          .select({ id: stores.id })
          .from(stores)
          .innerJoin(oauthTokens, eq(oauthTokens.storeId, stores.id))
          .where(like(stores.apiAddress, `%${domain}%`))
          .limit(1);
        resolvedStoreId = byDomain[0]?.id;
      }

      // Fallback: a Tray store can answer /auth.php on one domain
      // (e.g. *.commercesuite.com.br) while its api_address is a different
      // custom domain, so the substring match above can miss. When exactly
      // one store is connected, that ambiguity is moot — use it.
      if (!resolvedStoreId) {
        const connected = await db
          .select({ storeId: oauthTokens.storeId })
          .from(oauthTokens)
          .limit(2);
        if (connected.length === 1) {
          resolvedStoreId = connected[0]!.storeId;
        }
      }

      if (!resolvedStoreId) {
        return c.json(
          {
            error: "invalid_request",
            error_description: `loja não conectada: ${domain ?? "?"}. Reinstale o app na Tray.`,
          },
          400,
        );
      }
      storeId = resolvedStoreId;
    }

    // Mint a one-shot MCP authorization code. The PKCE check + bearer
    // mint happen on POST /token; we only store the code → store_id link
    // and the still-unconsumed verifier hash.
    const mcpCode = `mcpc_${randomHex(32)}`;
    await db
      .update(oauthPending)
      .set({
        mcpCode,
        storeId,
      })
      .where(eq(oauthPending.id, pendingId));

    // Redirect back to claude.ai's redirect_uri carrying the code+state.
    const redirect = appendQuery(pending.redirectUri, {
      code: mcpCode,
      state: pending.state,
    });
    return c.redirect(redirect, 302);
  };
}
