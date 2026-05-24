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
