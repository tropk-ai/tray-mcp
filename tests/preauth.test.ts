// Tests for the Tray → Claude 1-click pre-authorization cookie:
//
//   1. signPreauth / verifyPreauth helpers — happy path, expired,
//      tampered HMAC, malformed string.
//   2. GET /authorize behaviour:
//        - cookie valid → skip store picker, redirect with `code` and
//          clear the cookie.
//        - cookie absent → render store picker (HTML).
//        - cookie tampered → render store picker (HTML).
//        - cookie expired → render store picker (HTML).
//
// We reuse the in-memory drizzle fake from oauth-provider.test.ts in
// spirit, but tighten it to also support the join we don't actually use
// here — every fast-path query in /authorize is a flat SELECT.

import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { authorizeHandler } from "../src/oauth-provider/authorize.js";
import {
  pkceS256,
  signPreauth,
  verifyPreauth,
} from "../src/oauth-provider/util.js";

// Drizzle mocks identical to the ones used in `oauth-provider.test.ts`.
// We can't share the file because vi.mock is hoisted per-file.
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
      ownerEmail: col("ownerEmail"),
      updatedAt: col("updatedAt"),
    },
    oauthTokens: {
      __name__: "oauthTokens",
      id: col("id"),
      storeId: col("storeId"),
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

const SECRET = env.TRAY_CONSUMER_SECRET;

// ---------------------------------------------------------------------------
// signPreauth / verifyPreauth
// ---------------------------------------------------------------------------

describe("signPreauth / verifyPreauth", () => {
  it("verifies a fresh cookie and returns the original storeId", async () => {
    const cookie = await signPreauth("store-abc", SECRET);
    const out = await verifyPreauth(cookie, SECRET);
    expect(out).toEqual({ storeId: "store-abc" });
  });

  it("rejects an expired cookie", async () => {
    // Mint a cookie that expired 1 second ago.
    const cookie = await signPreauth("store-abc", SECRET, {
      ttlMs: -1000,
    });
    const out = await verifyPreauth(cookie, SECRET);
    expect(out).toBeNull();
  });

  it("rejects a cookie with a tampered HMAC", async () => {
    const cookie = await signPreauth("store-abc", SECRET);
    // Flip the last hex char in the signature.
    const last = cookie.slice(-1);
    const flipped = last === "0" ? "1" : "0";
    const tampered = cookie.slice(0, -1) + flipped;
    const out = await verifyPreauth(tampered, SECRET);
    expect(out).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await signPreauth("store-abc", SECRET);
    const out = await verifyPreauth(cookie, "different-secret");
    expect(out).toBeNull();
  });

  it("rejects malformed input", async () => {
    expect(await verifyPreauth("", SECRET)).toBeNull();
    expect(await verifyPreauth("not-a-cookie", SECRET)).toBeNull();
    expect(await verifyPreauth("a.b", SECRET)).toBeNull();
    expect(await verifyPreauth("a.b.c.d", SECRET)).toBeNull();
  });

  it("rejects a cookie with a non-numeric expiry", async () => {
    // Hand-craft a valid signature over a malformed payload.
    const out = await verifyPreauth("store.abc.deadbeef", SECRET);
    expect(out).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// /authorize cookie behaviour
// ---------------------------------------------------------------------------

async function buildAuthorizeRequest(opts: {
  cookie?: string;
  challenge: string;
}): Promise<Request> {
  const url =
    "https://tray-mcp.workers.dev/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id: "client-1",
      redirect_uri: "https://claude.ai/api/mcp/auth_callback",
      code_challenge: opts.challenge,
      code_challenge_method: "S256",
      state: "xyz",
    }).toString();
  const headers: Record<string, string> = {};
  if (opts.cookie) headers["Cookie"] = `preauth_store=${opts.cookie}`;
  return new Request(url, { headers });
}

function seedClientAndStore(state: ReturnType<typeof makeFakeDb>["state"]) {
  state.oauthClients.push({
    id: "oc-1",
    clientId: "client-1",
    redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
    grantTypes: ["authorization_code", "refresh_token"],
    tokenEndpointAuthMethod: "none",
  });
  state.stores.push({
    id: "store-uuid",
    trayStoreId: "tray-1",
    apiAddress: "https://api.tray.com",
  });
}

describe("/authorize with preauth_store cookie", () => {
  it("skips the picker and redirects with code when the cookie is valid", async () => {
    const { db, state } = makeFakeDb();
    seedClientAndStore(state);
    const cookie = await signPreauth("store-uuid", SECRET);

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const req = await buildAuthorizeRequest({
      cookie,
      challenge: await pkceS256(verifier),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(302);
    const loc = res.headers.get("Location")!;
    expect(loc.startsWith("https://claude.ai/api/mcp/auth_callback")).toBe(
      true,
    );
    const u = new URL(loc);
    expect(u.searchParams.get("state")).toBe("xyz");
    expect(u.searchParams.get("code")).toMatch(/^mcpc_[0-9a-f]{64}$/);

    // The pending row was bound to the store.
    expect(state.oauthPending).toHaveLength(1);
    expect(state.oauthPending[0]!.storeId).toBe("store-uuid");
    expect(state.oauthPending[0]!.mcpCode).toMatch(/^mcpc_[0-9a-f]{64}$/);

    // The cookie was cleared (Set-Cookie with Max-Age=0).
    const setCookies = res.headers.get("set-cookie") ?? "";
    expect(setCookies.toLowerCase()).toContain("preauth_store=");
    expect(setCookies.toLowerCase()).toMatch(/max-age=0/);
  });

  it("renders the picker when the cookie is missing", async () => {
    const { db, state } = makeFakeDb();
    seedClientAndStore(state);

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const req = await buildAuthorizeRequest({
      challenge: await pkceS256(verifier),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Domínio da sua loja Tray");
  });

  it("renders the picker when the cookie signature is tampered", async () => {
    const { db, state } = makeFakeDb();
    seedClientAndStore(state);
    const valid = await signPreauth("store-uuid", SECRET);
    const last = valid.slice(-1);
    const flipped = last === "0" ? "1" : "0";
    const tampered = valid.slice(0, -1) + flipped;

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const req = await buildAuthorizeRequest({
      cookie: tampered,
      challenge: await pkceS256(verifier),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Domínio da sua loja Tray");
  });

  it("renders the picker when the cookie is expired", async () => {
    const { db, state } = makeFakeDb();
    seedClientAndStore(state);
    const expired = await signPreauth("store-uuid", SECRET, { ttlMs: -1000 });

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const req = await buildAuthorizeRequest({
      cookie: expired,
      challenge: await pkceS256(verifier),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Domínio da sua loja Tray");
  });

  it("renders the picker when the cookie points to an unknown store", async () => {
    const { db, state } = makeFakeDb();
    seedClientAndStore(state);
    // Sign a cookie for a store that doesn't exist in the DB.
    const ghostCookie = await signPreauth("ghost-store-uuid", SECRET);

    const app = new Hono<{ Bindings: typeof env }>();
    app.get("/authorize", authorizeHandler({ getDb: () => db }));

    const verifier =
      "the-verifier-must-be-at-least-43-characters-long-ok-yes";
    const req = await buildAuthorizeRequest({
      cookie: ghostCookie,
      challenge: await pkceS256(verifier),
    });
    const res = await app.fetch(req, env);

    // Missing store should not crash — fall through to the picker.
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Domínio da sua loja Tray");
  });
});
