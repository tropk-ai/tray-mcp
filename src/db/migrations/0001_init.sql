-- Tray MCP initial schema.
-- Requires the pgcrypto extension for gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- stores: one row per Tray store that installed the app.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "stores" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "tray_store_id" text NOT NULL,
    "api_address" text NOT NULL,
    "owner_email" text,
    "plan" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "stores_tray_store_id_unique"
    ON "stores" ("tray_store_id");

-- ---------------------------------------------------------------------------
-- oauth_tokens: latest Tray OAuth tokens per store.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "oauth_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "access_token" text NOT NULL,
    "refresh_token" text NOT NULL,
    "access_expires_at" timestamptz NOT NULL,
    "refresh_expires_at" timestamptz NOT NULL,
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "oauth_tokens_store_id_idx"
    ON "oauth_tokens" ("store_id");

-- ---------------------------------------------------------------------------
-- mcp_sessions: bearer tokens issued to merchants for MCP access.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "mcp_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "bearer_hash" text NOT NULL,
    "label" text,
    "last_used_at" timestamptz,
    "expires_at" timestamptz,
    "revoked_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "mcp_sessions_store_id_idx"
    ON "mcp_sessions" ("store_id");

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_sessions_bearer_hash_unique"
    ON "mcp_sessions" ("bearer_hash");

-- ---------------------------------------------------------------------------
-- webhook_events: log of Tray webhook deliveries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
    "scope_name" text NOT NULL,
    "act" text NOT NULL,
    "seller_id" text,
    "payload" jsonb NOT NULL,
    "received_at" timestamptz NOT NULL DEFAULT now(),
    "processed_at" timestamptz,
    "error" text
);

CREATE INDEX IF NOT EXISTS "webhook_events_store_id_idx"
    ON "webhook_events" ("store_id");

CREATE INDEX IF NOT EXISTS "webhook_events_received_at_idx"
    ON "webhook_events" ("received_at");

-- ---------------------------------------------------------------------------
-- oauth_clients: MCP clients registered via Dynamic Client Registration
-- (RFC 7591). claude.ai registers itself here as a public client (no
-- secret) and uses PKCE on the /authorize + /token round-trip.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "oauth_clients" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id" text NOT NULL,
    "client_secret_hash" text,
    "client_name" text,
    "redirect_uris" jsonb NOT NULL,
    "grant_types" jsonb NOT NULL,
    "token_endpoint_auth_method" text NOT NULL DEFAULT 'none',
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_clients_client_id_unique"
    ON "oauth_clients" ("client_id");

-- ---------------------------------------------------------------------------
-- oauth_pending: short-lived state for an in-flight /authorize → /token
-- round-trip. Holds the OAuth client's PKCE challenge and the chosen
-- merchant store, then is consumed at /token to mint an MCP bearer.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "oauth_pending" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id" text NOT NULL,
    "redirect_uri" text NOT NULL,
    "state" text NOT NULL,
    "code_challenge" text NOT NULL,
    "code_challenge_method" text NOT NULL,
    "scope" text,
    "mcp_code" text,
    "store_id" uuid REFERENCES "stores"("id") ON DELETE SET NULL,
    "tray_store" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "expires_at" timestamptz NOT NULL,
    "consumed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "oauth_pending_client_id_idx"
    ON "oauth_pending" ("client_id");

CREATE INDEX IF NOT EXISTS "oauth_pending_mcp_code_idx"
    ON "oauth_pending" ("mcp_code");
