// Web-Standard MCP transport handler for Hono. We use the SDK's
// `WebStandardStreamableHTTPServerTransport` which speaks the spec-compliant
// JSON-RPC-over-HTTP-with-SSE protocol, and which runs unchanged on
// Cloudflare Workers (no Node `IncomingMessage` dependency).
//
// Each request gets its own server instance bound to the authenticated
// merchant context (`c.get('mcpCtx')`). Stateless mode is used so we don't
// have to thread session IDs through Workers' KV — every call carries its own
// bearer token via the auth middleware.

import type { Context } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import type { Bindings } from "../index.js";
import { createMcpServer } from "./server.js";

async function handle(c: Context<{ Bindings: Bindings }>): Promise<Response> {
  const ctx = c.get("mcpCtx");
  if (!ctx) {
    return c.json(
      { error: "internal", message: "MCP context was not set" },
      500,
    );
  }

  const server = createMcpServer(ctx);
  // Stateless mode: no sessionIdGenerator. Each HTTP call is independent.
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(c.req.raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "mcp_transport_error", message }, 500);
  }
}

export const mcpPost = handle;
export const mcpGet = handle;
