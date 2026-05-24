import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per Tray store that has installed this app.
 */
export const stores = pgTable(
  "stores",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    trayStoreId: text("tray_store_id").notNull(),
    apiAddress: text("api_address").notNull(),
    ownerEmail: text("owner_email"),
    plan: text("plan"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    trayStoreIdUnique: uniqueIndex("stores_tray_store_id_unique").on(
      table.trayStoreId,
    ),
  }),
);

/**
 * Latest Tray OAuth tokens for a store. We always upsert on (store_id).
 */
export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    accessExpiresAt: timestamp("access_expires_at", {
      withTimezone: true,
    }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", {
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    storeIdIdx: index("oauth_tokens_store_id_idx").on(table.storeId),
  }),
);

/**
 * Bearer tokens that the merchant uses to authenticate MCP calls.
 * `bearer_hash` is the SHA-256 of the raw bearer.
 */
export const mcpSessions = pgTable(
  "mcp_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    bearerHash: text("bearer_hash").notNull(),
    label: text("label"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    storeIdIdx: index("mcp_sessions_store_id_idx").on(table.storeId),
    bearerHashUnique: uniqueIndex("mcp_sessions_bearer_hash_unique").on(
      table.bearerHash,
    ),
  }),
);

/**
 * Audit log of webhook deliveries from Tray.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    scopeName: text("scope_name").notNull(),
    act: text("act").notNull(),
    sellerId: text("seller_id"),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => ({
    storeIdIdx: index("webhook_events_store_id_idx").on(table.storeId),
    receivedAtIdx: index("webhook_events_received_at_idx").on(table.receivedAt),
  }),
);

/**
 * OAuth 2.1 Dynamic Client Registration (RFC 7591) — one row per MCP
 * client (e.g. claude.ai) that has registered with our authorization
 * server. Public clients (no secret) use PKCE; confidential clients can
 * authenticate with `client_secret_hash`.
 */
export const oauthClients = pgTable(
  "oauth_clients",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: text("client_id").notNull(),
    clientSecretHash: text("client_secret_hash"),
    clientName: text("client_name"),
    redirectUris: jsonb("redirect_uris").notNull(),
    grantTypes: jsonb("grant_types").notNull(),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method")
      .notNull()
      .default("none"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdUnique: uniqueIndex("oauth_clients_client_id_unique").on(
      table.clientId,
    ),
  }),
);

/**
 * Short-lived state for an in-flight /authorize → /token round-trip.
 * Stores the OAuth client's PKCE challenge + redirect target, and is
 * later updated with the `mcp_code` and `store_id` once the merchant
 * finishes installing on Tray.
 */
export const oauthPending = pgTable(
  "oauth_pending",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: text("client_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    state: text("state").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull(),
    scope: text("scope"),
    mcpCode: text("mcp_code"),
    storeId: uuid("store_id").references(() => stores.id, {
      onDelete: "set null",
    }),
    trayStore: text("tray_store"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => ({
    clientIdIdx: index("oauth_pending_client_id_idx").on(table.clientId),
    mcpCodeIdx: index("oauth_pending_mcp_code_idx").on(table.mcpCode),
  }),
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;
export type McpSession = typeof mcpSessions.$inferSelect;
export type NewMcpSession = typeof mcpSessions.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type OAuthClient = typeof oauthClients.$inferSelect;
export type NewOAuthClient = typeof oauthClients.$inferInsert;
export type OAuthPending = typeof oauthPending.$inferSelect;
export type NewOAuthPending = typeof oauthPending.$inferInsert;
