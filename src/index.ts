import { Hono } from "hono";

import { createDb } from "./lib/db.js";
import { authMcp } from "./mcp/auth.js";
import { mcpGet, mcpPost } from "./mcp/transport.js";
import { callbackHandler } from "./oauth/callback.js";
import { installHandler } from "./oauth/install.js";
import { successHandler } from "./oauth/success.js";
import { authorizeHandler } from "./oauth-provider/authorize.js";
import {
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "./oauth-provider/metadata.js";
import { registerHandler } from "./oauth-provider/register.js";
import { storeSelectedHandler } from "./oauth-provider/store-selected.js";
import { tokenHandler } from "./oauth-provider/token.js";
import { trayCallbackHandler } from "./oauth-provider/tray-callback.js";
import { makeWebhookHandler } from "./webhooks/receiver.js";

export type Bindings = {
  DATABASE_URL: string;
  TRAY_CONSUMER_KEY: string;
  TRAY_CONSUMER_SECRET: string;
  MCP_HOST: string;
  /**
   * HMAC secret used to sign the short-lived `preauth_store` cookie that
   * powers the Tray → Claude 1-click connector flow. Optional: if unset
   * we fall back to `TRAY_CONSUMER_SECRET`, which is already a Tray-side
   * shared secret we trust. See `oauth-provider/util.ts#preauthSecret`.
   */
  PREAUTH_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * Healthcheck. Useful for uptime probes and verifying a deploy is live.
 */
app.get("/", (c) =>
  c.json({
    status: "ok",
    name: "tray-mcp",
  }),
);

// ---------------------------------------------------------------------------
// Legacy Tray-marketplace install flow (manual bearer copy/paste). Still
// supported alongside the new OAuth-provider flow below.
// ---------------------------------------------------------------------------

/**
 * Step 1 of the legacy Tray OAuth install flow. The merchant lands here
 * from the Tray app store and is redirected to Tray's authorize URL.
 */
app.get("/oauth/install", installHandler);

/**
 * Step 2 of the legacy Tray OAuth install flow. Tray redirects here with
 * a short-lived `code`; the handler exchanges it for tokens, persists
 * them, mints an MCP bearer and redirects to `/install-success`.
 */
app.get("/oauth/callback", callbackHandler);

/**
 * Success page shown to the merchant after install completes. Renders
 * the freshly issued MCP bearer token (one-time display) and a few
 * client config snippets.
 */
app.get("/install-success", successHandler);

// ---------------------------------------------------------------------------
// OAuth 2.1 provider — lets MCP clients (claude.ai) connect in one click
// without the merchant copy/pasting a bearer. See `src/oauth-provider/`.
// ---------------------------------------------------------------------------

/**
 * RFC 9728 — tells the MCP client which authorization server can issue
 * tokens for this resource.
 */
app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);

/**
 * RFC 8414 — advertises this OAuth 2.1 authorization server's endpoints
 * and capabilities (PKCE S256, DCR, etc).
 */
app.get(
  "/.well-known/oauth-authorization-server",
  authorizationServerMetadata,
);

/**
 * RFC 7591 — Dynamic Client Registration. claude.ai POSTs its
 * redirect_uri here and receives a fresh `client_id`.
 */
app.post("/register", registerHandler());

/**
 * GET /authorize — start of the authorization code flow. Persists a
 * pending row keyed on a fresh UUID and either renders a store-picker
 * form or (if `?store=` is provided) jumps straight to Tray's /auth.php.
 */
app.get("/authorize", authorizeHandler());

/**
 * POST /authorize/store-selected — the merchant submitted the store
 * picker form; redirect them to Tray's /auth.php.
 */
app.post("/authorize/store-selected", storeSelectedHandler());

/**
 * GET /oauth/tray-callback — Tray redirects here after the merchant
 * authorizes the app. We exchange the Tray code for tokens, mint an
 * `mcp_code`, and redirect back to the OAuth client's redirect_uri.
 */
app.get("/oauth/tray-callback", trayCallbackHandler());

/**
 * POST /token — final step. Validates PKCE on `authorization_code`
 * grants and rotates `refresh_token` grants. Issues an MCP bearer
 * usable by `authMcp`.
 */
app.post("/token", tokenHandler());

// ---------------------------------------------------------------------------
// MCP transport — protected by bearer token.
// ---------------------------------------------------------------------------

/**
 * Streamable HTTP MCP transport endpoint. Authenticated via a bearer
 * token tied to a store. On 401 we emit a `WWW-Authenticate: Bearer
 * resource_metadata=...` header so spec-compliant MCP clients can
 * discover our OAuth provider and start the auth flow automatically.
 */
function withWwwAuthenticate() {
  return async (c: import("hono").Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    await next();
    if (c.res.status === 401) {
      const host = c.env.MCP_HOST.replace(/\/$/, "");
      const challenge =
        `Bearer realm="MCP", ` +
        `resource_metadata="${host}/.well-known/oauth-protected-resource"`;
      c.res.headers.set("WWW-Authenticate", challenge);
    }
  };
}

app.post("/mcp", withWwwAuthenticate(), authMcp(), mcpPost);
app.get("/mcp", withWwwAuthenticate(), authMcp(), mcpGet);

/**
 * Tray webhook receiver. The `:store_id` path param identifies the tenant.
 * It accepts either our internal `stores.id` UUID (preferred — that's the
 * URL we register with Tray) or, as a fallback, the `tray_store_id`.
 *
 * Tray gives us a 1-second budget to respond; the handler returns 200
 * immediately and defers the DB insert via `executionCtx.waitUntil()`.
 */
app.post(
  "/webhook/:store_id",
  makeWebhookHandler((env) => createDb((env as Bindings).DATABASE_URL)),
);

export default app;
