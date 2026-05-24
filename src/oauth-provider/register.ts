// POST /register — Dynamic Client Registration (RFC 7591).
//
// claude.ai POSTs here with the redirect_uri it wants to use for the
// authorization code redirect. We issue a fresh `client_id` and persist
// it; public clients (token_endpoint_auth_method=none) have no secret.

import type { Context } from "hono";
import { z } from "zod";

import { oauthClients } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";

const registerBodySchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1),
  client_name: z.string().min(1).max(200).optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z
    .enum(["none", "client_secret_basic", "client_secret_post"])
    .optional(),
  scope: z.string().optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export interface RegisterDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
}

/**
 * Core registration logic, decoupled from Hono so it can be unit-tested.
 */
export async function registerClient(params: {
  db: Database;
  body: RegisterBody;
}): Promise<{
  client_id: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  client_name?: string;
  scope?: string;
}> {
  const clientId = crypto.randomUUID();
  const grantTypes = params.body.grant_types ?? [
    "authorization_code",
    "refresh_token",
  ];
  const responseTypes = params.body.response_types ?? ["code"];
  const authMethod = params.body.token_endpoint_auth_method ?? "none";

  await params.db.insert(oauthClients).values({
    clientId,
    clientName: params.body.client_name ?? null,
    redirectUris: params.body.redirect_uris,
    grantTypes,
    tokenEndpointAuthMethod: authMethod,
  });

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: params.body.redirect_uris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: authMethod,
    ...(params.body.client_name ? { client_name: params.body.client_name } : {}),
    ...(params.body.scope ? { scope: params.body.scope } : {}),
  };
}

/**
 * Hono handler for POST /register. Accepts JSON, validates with zod,
 * persists, and returns 201 with the issued client_id.
 */
export function registerHandler(
  deps: RegisterDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));

  return async (c) => {
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json(
        { error: "invalid_client_metadata", error_description: "body must be JSON" },
        400,
      );
    }

    const parsed = registerBodySchema.safeParse(json);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_client_metadata",
          error_description: parsed.error.message,
        },
        400,
      );
    }

    const db = await resolveDb(c.env);
    const result = await registerClient({ db, body: parsed.data });
    return c.json(result, 201);
  };
}
