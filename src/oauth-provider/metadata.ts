// OAuth 2.1 / MCP discovery endpoints.
//
// - GET /.well-known/oauth-protected-resource (RFC 9728): tells the
//   client which authorization servers can issue tokens for this resource.
// - GET /.well-known/oauth-authorization-server (RFC 8414): lists the
//   endpoints and capabilities of our authorization server.

import type { Context } from "hono";

import type { Bindings } from "../index.js";

import { stripTrailingSlash } from "./util.js";

/**
 * GET /.well-known/oauth-protected-resource — RFC 9728.
 *
 * The MCP client (claude.ai) reads this in response to the 401 from
 * /mcp to learn where to fetch authorization-server metadata.
 */
export function protectedResourceMetadata(
  c: Context<{ Bindings: Bindings }>,
): Response {
  const host = stripTrailingSlash(c.env.MCP_HOST);
  return c.json({
    resource: `${host}/mcp`,
    authorization_servers: [host],
    bearer_methods_supported: ["header"],
    resource_documentation: `${host}/`,
  });
}

/**
 * GET /.well-known/oauth-authorization-server — RFC 8414.
 *
 * Advertises the OAuth 2.1 endpoints, PKCE support and DCR endpoint.
 */
export function authorizationServerMetadata(
  c: Context<{ Bindings: Bindings }>,
): Response {
  const host = stripTrailingSlash(c.env.MCP_HOST);
  return c.json({
    issuer: host,
    authorization_endpoint: `${host}/authorize`,
    token_endpoint: `${host}/token`,
    registration_endpoint: `${host}/register`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
    service_documentation: `${host}/`,
  });
}
