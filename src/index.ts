import { Hono } from "hono";

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
 *
 * Implemented by the OAuth agent.
 */
app.get("/oauth/install", (c) =>
  c.json(
    {
      error: "not_implemented",
      message: "GET /oauth/install is not implemented yet.",
    },
    501,
  ),
);

/**
 * Step 2 of the Tray OAuth install flow. Tray redirects here with a
 * short-lived `code`; the handler must exchange it for tokens and
 * persist them.
 *
 * Implemented by the OAuth agent.
 */
app.get("/oauth/callback", (c) =>
  c.json(
    {
      error: "not_implemented",
      message: "GET /oauth/callback is not implemented yet.",
    },
    501,
  ),
);

/**
 * Success page shown to the merchant after install completes. Will be
 * rendered as HTML (with the generated MCP bearer token).
 */
app.get("/install-success", (c) =>
  c.json(
    {
      error: "not_implemented",
      message: "GET /install-success is not implemented yet.",
    },
    501,
  ),
);

/**
 * Streamable HTTP MCP transport endpoint. Authenticated via a bearer
 * token tied to a store.
 *
 * Implemented by the MCP agent.
 */
app.post("/mcp", (c) =>
  c.json(
    {
      error: "not_implemented",
      message: "POST /mcp is not implemented yet.",
    },
    501,
  ),
);

/**
 * Tray webhook receiver. The store_id path param identifies the tenant.
 *
 * Implemented by the webhooks agent.
 */
app.post("/webhook/:store_id", (c) =>
  c.json(
    {
      error: "not_implemented",
      message: "POST /webhook/:store_id is not implemented yet.",
      store_id: c.req.param("store_id"),
    },
    501,
  ),
);

export default app;
