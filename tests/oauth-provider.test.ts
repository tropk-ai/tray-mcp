import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import {
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "../src/oauth-provider/metadata.js";
import { authorizeHandler } from "../src/oauth-provider/authorize.js";
import { registerClient, registerHandler } from "../src/oauth-provider/register.js";
import { storeSelectedHandler } from "../src/oauth-provider/store-selected.js";
import { tokenHandler } from "../src/oauth-provider/token.js";
import { trayCallbackHandler } from "../src/oauth-provider/tray-callback.js";
import { pkceS256, sha256Hex } from "../src/oauth-provider/util.js";

/**
 * Mirror of the relevant `drizzle-orm` helpers + schema for a tiny
 * in-memory DB. The handlers always go through this fake.
 */
vi.mock("drizzle-orm", () => ({
  eq:
    (col: { field: string }, val: unknown) =>
    (row: Record<string, unknown>) =>
      row[col.field] === val,
  and:
    (...preds: Array<(row: Record<string, unknown>) => boolean>) =>
    (row: Record<string, unknown>) =>
      preds.every((p) => p(row)),
  isNull:
    (col: { field: string }) =>
    (row: Record<string, unknown>) =>
      row[col.field] == null,
  sql: () => ({}),
}));

vi.mock("../src/db/schema.js", () => {
  const col = (field: string) => ({ field });
  return {
    stores: {
      __name__: "stores",
      id: col("id"),
      trayStoreId: col("trayStoreId"),
      apiAddress: col("apiAddress"),
      updatedAt: col("updatedAt"),
    },
    oauthTokens: {
      __name__: "oauthTokens",
      id: col("id"),
      storeId: col("storeId"),
      accessToken: col("accessToken"),
      refreshToken: col("refreshToken"),
      accessExpiresAt: col("accessExpiresAt"),
      refreshExpiresAt: col("refreshExpiresAt"),
      updatedAt: col("updatedAt"),
    },
    mcpSessions: {
      __name__: "mcpSessions",
      id: col("id"),
      storeId: col("storeId"),
      bearerHash: col("bearerHash"),
      label: col("label"),
      expiresAt: col("expiresAt"),
      revokedAt: col("revokedAt"),
    },
    oauthClients: {
      __name__: "oauthClients",
      id: col("id"),
      clientId: col("clientId"),
      clientName: col("clientName"),
      redirectUris: col("redirectUris"),
      grantTypes: col("grantTypes"),
      tokenEndpointAuthMethod: col("tokenEndpointAuthMethod"),
    },
    oauthPending: {
      __name__: "oauthPending",
      id: col("id"),
      clientId: col("clientId"),
      redirectUri: col("redirectUri"),
      state: col("state"),
      codeChallenge: col("codeChallenge"),
      codeChallengeMethod: col("codeChallengeMethod"),
      scope: col("scope"),
      mcpCode: col("mcpCode"),
      storeId: col("storeId"),
      trayStore: col("trayStore"),
      expiresAt: col("expiresAt"),
      consumedAt: col("consumedAt"),
    },
  };
});

function makeFakeDb() {
  const state = {
    stores: [] as Array<Record<string, unknown>>,
    oauthTokens: [] as Array<Record<string, unknown>>,
    mcpSessions: [] as Array<Record<string, unknown>>,
    oauthClients: [] as Array<Record<string, unknown>>,
    oauthPending: [] as Array<Record<string, unknown>>,
  };
  let counter = 0;
  const nextId = () => `id-${++counter}`;

  const tableNameOf = (tbl: unknown): keyof typeof state => {
    const t = tbl as { __name__: keyof typeof state };
    return t.__name__;
  };

  function insert(table: unknown) {
    const name = tableNameOf(table);
    let pending: Record<string, unknown> | null = null;

    const chain = {
      values(v: Record<string, unknown>) {
        pending = { ...v };
        return chain;
      },
      onConflictDoUpdate() {
        return chain;
      },
      async returning() {
        const row = pending;
        pending = null;
        if (!row) throw new Error("no values()");
        const created = { id: row.id ?? nextId(), ...row };
        state[name].push(created as Record<string, unknown>);
        return [created];
      },
      then(resolve: (v: unknown) => void) {
        return chain.returning().then(resolve);
      },
    };
    return chain;
  }

  function select(_cols?: Record<string, unknown>) {
    return {
      from(table: unknown) {
        const name = tableNameOf(table);
        return {
          where(pred: (row: Record<string, unknown>) => boolean) {
            return {
              async limit(_n: number) {
                return state[name].filter(pred);
              },
            };
          },
        };
      },
    };
  }

  function update(table: unknown) {
    const name = tableNameOf(table);
    return {
      set(patch: Record<string, unknown>) {
        return {
          async where(pred: (row: Record<string, unknown>) => boolean) {
            for (const row of state[name]) {
              if (pred(row)) Object.assign(row, patch);
            }
          },
        };
      },
    };
  }

  function del(table: unknown) {
    const name = tableNameOf(table);
    return {
      async where(pred: (row: Record<string, unknown>) => boolean) {
        const kept = state[name].filter((r) => !pred(r));
        state[name].length = 0;
        for (const r of kept) state[name].push(r);
      },
    };
  }

  return {
    db: { insert, select, update, delete: del } as unknown as import("../src/lib/db.js").Database,
    state,
  };
}

const env = {
  DATABASE_URL: "postgres://test",
  TRAY_CONSUMER_KEY: "ck",
  TRAY_CONSUMER_SECRET: "cs",
  MCP_HOST: "https://tray-mcp.workers.dev",
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe("OAuth metadata", () => {
  it("oauth-protected-resource returns expected shape", async () => {
    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
    const res = await app.request("/.well-known/oauth-protected-resource", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.resource).toBe("https://tray-mcp.workers.dev/mcp");
    expect(body.authorization_servers).toEqual([
      "https://tray-mcp.workers.dev",
    ]);
  });

  it("oauth-authorization-server returns endpoints + PKCE S256", async () => {
    const app = new Hono<{ Bindings: typeof env }>();
    app.get(
      "/.well-known/oauth-authorization-server",
      authorizationServerMetadata,
    );
    const res = await app.request("/.well-known/oauth-authorization-server", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.issuer).toBe("https://tray-mcp.workers.dev");
    expect(body.authorization_endpoint).toBe(
      "https://tray-mcp.workers.dev/authorize",
    );
    expect(body.token_endpoint).toBe("https://tray-mcp.workers.dev/token");
    expect(body.registration_endpoint).toBe(
      "https://tray-mcp.workers.dev/register",
    );
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(body.grant_types_supported).toContain("authorization_code");
    expect(body.grant_types_supported).toContain("refresh_token");
  });
});

// ---------------------------------------------------------------------------
// /register (DCR)
// ---------------------------------------------------------------------------

describe("/register", () => {
  it("creates a client and returns a fresh client_id", async () => {
    const { db, state } = makeFakeDb();
    const out = await registerClient({
      db,
      body: {
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
        client_name: "Claude",
      },
    });
    expect(out.client_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(out.redirect_uris).toEqual([
      "https://claude.ai/api/mcp/auth_callback",
    ]);
    expect(out.grant_types).toContain("authorization_code");
    expect(state.oauthClients).toHaveLength(1);
    expect(state.oauthClients[0]!.clientId).toBe(out.client_id);
  });

  it("returns 400 on invalid body", async () => {
    const { db } = makeFakeDb();
    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/register", registerHandler({ getDb: () => db }));
    const res = await app.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ not: "valid" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("Hono handler returns 201 and persists", async () => {
    const { db, state } = makeFakeDb();
    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/register", registerHandler({ getDb: () => db }));
    const res = await app.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
          client_name: "Claude",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { client_id: string };
    expect(state.oauthClients).toHaveLength(1);
    expect(state.oauthClients[0]!.clientId).toBe(body.client_id);
  });
});

// ---------------------------------------------------------------------------
// /authorize + /authorize/store-selected
// ---------------------------------------------------------------------------

describe("/authorize", () => {
  async function seedClient(state: ReturnType<typeof makeFakeDb>["state"]) {
    const reg = await registerClient({
      db: (makeFakeDb as unknown as () => never)(),
      body: { redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] },
    }).catch(() => null);
    // We need a client in `state` — insert directly.
    const clientId = reg?.client_id ?? "client-1";
    state.oauthClients.push({
      id: "oc-1",
      clientId,
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
      grantTypes: ["authorization_code", "refresh_token"],
      tokenEndpointAuthMethod: "none",
    });
    return clientId;
  }

  it("renders the store picker when no `store` param is supplied", async () => {
    const { db, state } = makeFakeDb();
    state.oauthClients.push({
      id: "oc-1",
      clientId: "client-1",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
      grantTypes: ["authorization_code", "refresh_token"],
      tokenEndpointAuthMethod: "none",
    });

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier = "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const challenge = await pkceS256(verifier);
    const res = await app.request(
      "/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id: "client-1",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_challenge: challenge,
          code_challenge_method: "S256",
          state: "xyz",
        }).toString(),
      {},
      env,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Domínio da sua loja Tray");
    expect(state.oauthPending).toHaveLength(1);
  });

  it("redirects straight to Tray when `store` is pre-selected", async () => {
    const { db, state } = makeFakeDb();
    state.oauthClients.push({
      id: "oc-1",
      clientId: "client-1",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
      grantTypes: ["authorization_code", "refresh_token"],
      tokenEndpointAuthMethod: "none",
    });

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier = "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const challenge = await pkceS256(verifier);
    const res = await app.request(
      "/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id: "client-1",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_challenge: challenge,
          code_challenge_method: "S256",
          state: "xyz",
          store: "loja123.commercesuite.com.br",
        }).toString(),
      {},
      env,
    );
    expect(res.status).toBe(302);
    const loc = res.headers.get("Location")!;
    expect(loc).toContain("https://loja123.commercesuite.com.br/auth.php");
    expect(loc).toContain("consumer_key=ck");
    expect(state.oauthPending).toHaveLength(1);
    expect(state.oauthPending[0]!.trayStore).toBe(
      "loja123.commercesuite.com.br",
    );
  });

  it("rejects unknown client_id", async () => {
    const { db } = makeFakeDb();
    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));
    const challenge = await pkceS256(
      "the-verifier-must-be-at-least-43-characters-long-ok-yes",
    );
    const res = await app.request(
      "/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id: "nope",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_challenge: challenge,
          code_challenge_method: "S256",
          state: "xyz",
        }).toString(),
      {},
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("/authorize/store-selected", () => {
  it("redirects to Tray /auth.php with consumer_key + callback", async () => {
    const { db, state } = makeFakeDb();
    state.oauthPending.push({
      id: "pending-1",
      clientId: "client-1",
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      state: "xyz",
      codeChallenge: "challenge",
      codeChallengeMethod: "S256",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/authorize/store-selected", storeSelectedHandler({ getDb: () => db }));

    const res = await app.request(
      "/authorize/store-selected",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          pending_id: "pending-1",
          store_domain: "lojaABC.commercesuite.com.br",
        }).toString(),
      },
      env,
    );
    expect(res.status).toBe(302);
    const loc = res.headers.get("Location")!;
    expect(loc).toContain("https://lojaABC.commercesuite.com.br/auth.php");
    expect(loc).toContain("consumer_key=ck");
    expect(state.oauthPending[0]!.trayStore).toBe(
      "lojaABC.commercesuite.com.br",
    );
  });
});

// ---------------------------------------------------------------------------
// /token — PKCE validation + end-to-end happy path
// ---------------------------------------------------------------------------

describe("/token", () => {
  it("emits a bearer when PKCE matches", async () => {
    const { db, state } = makeFakeDb();
    const verifier = "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const challenge = await pkceS256(verifier);
    state.stores.push({
      id: "store-uuid",
      trayStoreId: "tray-1",
      apiAddress: "https://api.tray.com",
    });
    state.oauthPending.push({
      id: "pending-1",
      clientId: "client-1",
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      state: "xyz",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      mcpCode: "the-code",
      storeId: "store-uuid",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/token", tokenHandler({ getDb: () => db }));

    const res = await app.request(
      "/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "the-code",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          client_id: "client-1",
          code_verifier: verifier,
        }).toString(),
      },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token).toMatch(/^mcp_at_[0-9a-f]{64}$/);
    expect(body.refresh_token).toMatch(/^mcp_rt_[0-9a-f]{64}$/);
    expect(body.expires_in).toBe(3600);
    // The bearer is stored hashed (sha256), not plaintext.
    const accessHash = await sha256Hex(body.access_token);
    expect(state.mcpSessions.some((s) => s.bearerHash === accessHash)).toBe(true);
    // The pending row is now consumed.
    expect(state.oauthPending[0]!.consumedAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid PKCE verifier", async () => {
    const { db, state } = makeFakeDb();
    const challenge = await pkceS256("right-verifier-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x");
    state.stores.push({
      id: "store-uuid",
      trayStoreId: "tray-1",
      apiAddress: "https://api.tray.com",
    });
    state.oauthPending.push({
      id: "pending-1",
      clientId: "client-1",
      redirectUri: "https://claude.ai/api/mcp/auth_callback",
      state: "xyz",
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      mcpCode: "the-code",
      storeId: "store-uuid",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });

    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/token", tokenHandler({ getDb: () => db }));

    const res = await app.request(
      "/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "the-code",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          client_id: "client-1",
          code_verifier: "wrong-wrong-wrong-wrong-wrong-wrong-wrong-wrong",
        }).toString(),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_grant");
  });
});

// ---------------------------------------------------------------------------
// End-to-end mocked flow: register → authorize → store-select →
// tray-callback (mocked Tray /auth) → token → 200 with bearer.
// ---------------------------------------------------------------------------

describe("end-to-end OAuth provider flow", () => {
  it("happy path mints a working bearer", async () => {
    const { db, state } = makeFakeDb();

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const challenge = await pkceS256(verifier);
    const redirectUri = "https://claude.ai/api/mcp/auth_callback";

    // 1. /register
    const app = new Hono<{ Bindings: typeof env }>();
    app.post("/register", registerHandler({ getDb: () => db }));
    app.get("/authorize", authorizeHandler({ getDb: () => db }));
    app.post(
      "/authorize/store-selected",
      storeSelectedHandler({ getDb: () => db }),
    );
    // Inject a mock install function so we don't hit Tray.
    app.get(
      "/oauth/tray-callback",
      trayCallbackHandler({
        getDb: () => db,
        installFn: async (p) => {
          state.stores.push({
            id: "store-uuid",
            trayStoreId: "tray-1",
            apiAddress: p.apiAddress,
          });
          return {
            storeId: "store-uuid",
            sessionId: "sess-legacy",
            bearer: "legacy-bearer-unused",
          };
        },
      }),
    );
    app.post("/token", tokenHandler({ getDb: () => db }));

    const regRes = await app.request(
      "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_uris: [redirectUri] }),
      },
      env,
    );
    expect(regRes.status).toBe(201);
    const { client_id } = (await regRes.json()) as { client_id: string };

    // 2. /authorize?store=… (skip the picker for the test)
    const authRes = await app.request(
      "/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id,
          redirect_uri: redirectUri,
          code_challenge: challenge,
          code_challenge_method: "S256",
          state: "the-state",
          store: "lojaXYZ.commercesuite.com.br",
        }).toString(),
      {},
      env,
    );
    expect(authRes.status).toBe(302);
    const trayLoc = authRes.headers.get("Location")!;
    // Extract our pending id from the callback URL Tray will hit.
    const pendingMatch = /pending=([^&]+)/.exec(decodeURIComponent(trayLoc));
    const pendingId = pendingMatch![1]!;

    // 3. simulate Tray redirecting back
    const cbRes = await app.request(
      "/oauth/tray-callback?" +
        new URLSearchParams({
          code: "tray-code",
          api_address: "https://api.tray.com",
          pending: pendingId,
        }).toString(),
      {},
      env,
    );
    expect(cbRes.status).toBe(302);
    const claudeLoc = cbRes.headers.get("Location")!;
    expect(claudeLoc.startsWith(redirectUri)).toBe(true);
    const u = new URL(claudeLoc);
    const code = u.searchParams.get("code")!;
    expect(u.searchParams.get("state")).toBe("the-state");

    // 4. /token
    const tokenRes = await app.request(
      "/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id,
          code_verifier: verifier,
        }).toString(),
      },
      env,
    );
    expect(tokenRes.status).toBe(200);
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
    };
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();

    // 5. The minted access token's sha256 lives in mcp_sessions.
    const hash = await sha256Hex(tokens.access_token);
    expect(state.mcpSessions.some((s) => s.bearerHash === hash)).toBe(true);
  });
});
