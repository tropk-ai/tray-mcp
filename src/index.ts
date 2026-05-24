import { Hono } from "hono";

import { createDb } from "./lib/db.js";
import { authMcp } from "./mcp/auth.js";
import { mcpGet, mcpPost } from "./mcp/transport.js";
import { callbackHandler } from "./oauth/callback.js";
import { installHandler } from "./oauth/install.js";
import { successHandler } from "./oauth/success.js";
import { makeWebhookHandler } from "./webhooks/receiver.js";

export type Bindings = {
  DATABASE_URL: string;
  TRAY_CONSUMER_KEY: string;
  TRAY_CONSUMER_SECRET: string;
  MCP_HOST: string;
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

/**
 * Step 1 of the Tray OAuth install flow. The merchant lands here from
 * the Tray app store and is redirected to Tray's authorize URL.
 */
app.get("/oauth/install", installHandler);

/**
 * Step 2 of the Tray OAuth install flow. Tray redirects here with a
 * short-lived `code`; the handler exchanges it for tokens, persists
 * them, mints an MCP bearer and redirects to `/install-success`.
 */
app.get("/oauth/callback", callbackHandler);

/**
 * Success page shown to the merchant after install completes. Renders
 * the freshly issued MCP bearer token (one-time display) and a few
 * client config snippets.
 */
app.get("/install-success", successHandler);

/**
 * Streamable HTTP MCP transport endpoint. Authenticated via a bearer
 * token tied to a store.
 */
app.post("/mcp", authMcp(), mcpPost);
app.get("/mcp", authMcp(), mcpGet);

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
