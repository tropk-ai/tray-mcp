import { describe, expect, it, vi } from "vitest";

import {
  completeInstall,
  exchangeCodeForTokens,
  parseTrayDate,
} from "../src/oauth/callback.js";
import {
  getValidAccessToken,
  refreshTokens,
} from "../src/oauth/refresh.js";

/**
 * Minimal in-memory fake of the bits of the drizzle client our handlers
 * actually use. Each call is captured so tests can assert on it.
 *
 * The shape mirrors drizzle's fluent builder:
 *   db.insert(table).values(...).onConflictDoUpdate(...).returning()
 *   db.select().from(table).where(...).limit(...)
 *   db.update(table).set(...).where(...)
 *   db.delete(table).where(...)
 */
function makeFakeDb() {
  const state = {
    stores: [] as Array<{
      id: string;
      trayStoreId: string;
      apiAddress: string;
      updatedAt: Date;
      createdAt: Date;
    }>,
    oauthTokens: [] as Array<{
      id: string;
      storeId: string;
      accessToken: string;
      refreshToken: string;
      accessExpiresAt: Date;
      refreshExpiresAt: Date;
      updatedAt: Date;
    }>,
    mcpSessions: [] as Array<{
      id: string;
      storeId: string;
      bearerHash: string;
      label: string | null;
      createdAt: Date;
    }>,
  };

  let counter = 0;
  const nextId = () => `id-${++counter}`;

  // Identify a table by the unique table-name brand drizzle attaches.
  // We pattern-match on the symbol the test passes in (we pass the real
  // schema object so we can use referential equality).
  const tableNameOf = (tbl: unknown): "stores" | "oauthTokens" | "mcpSessions" => {
    // drizzle stores name internally — but for the fake we use
    // attached markers from the import shim below.
    const t = tbl as { __name__?: string };
    if (!t.__name__) throw new Error("table marker missing");
    return t.__name__ as "stores" | "oauthTokens" | "mcpSessions";
  };

  function insert(table: unknown) {
    const name = tableNameOf(table);
    let pending: Record<string, unknown> | null = null;
    let conflictUpdate: Record<string, unknown> | null = null;

    const chain = {
      values(v: Record<string, unknown>) {
        pending = { ...v };
        return chain;
      },
      onConflictDoUpdate(opts: { set: Record<string, unknown> }) {
        conflictUpdate = opts.set;
        return chain;
      },
      async returning() {
        const row = pending;
        pending = null;
        if (!row) throw new Error("no values()");
        if (name === "stores") {
          const trayStoreId = row.trayStoreId as string;
          const existing = state.stores.find(
            (s) => s.trayStoreId === trayStoreId,
          );
          if (existing && conflictUpdate) {
            Object.assign(existing, conflictUpdate);
            return [{ ...existing }];
          }
          const created = {
            id: nextId(),
            trayStoreId,
            apiAddress: row.apiAddress as string,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.stores.push(created);
          return [{ ...created }];
        }
        if (name === "oauthTokens") {
          const created = {
            id: nextId(),
            storeId: row.storeId as string,
            accessToken: row.accessToken as string,
            refreshToken: row.refreshToken as string,
            accessExpiresAt: row.accessExpiresAt as Date,
            refreshExpiresAt: row.refreshExpiresAt as Date,
            updatedAt: new Date(),
          };
          state.oauthTokens.push(created);
          return [{ ...created }];
        }
        if (name === "mcpSessions") {
          const created = {
            id: nextId(),
            storeId: row.storeId as string,
            bearerHash: row.bearerHash as string,
            label: (row.label as string | undefined) ?? null,
            createdAt: new Date(),
          };
          state.mcpSessions.push(created);
          return [{ ...created }];
        }
        throw new Error(`unknown table: ${name}`);
      },
      // Allow await on the builder itself (drizzle inserts without
      // returning() resolve to nothing, but we keep this for safety).
      then(resolve: (v: unknown) => void) {
        return chain.returning().then(resolve);
      },
    };
    return chain;
  }

  function select() {
    return {
      from(table: unknown) {
        const name = tableNameOf(table);
        return {
          where(pred: (row: Record<string, unknown>) => boolean) {
            return {
              async limit(_n: number) {
                const rows = state[name] as Array<Record<string, unknown>>;
                return rows.filter(pred);
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
            const rows = state[name] as Array<Record<string, unknown>>;
            for (const row of rows) {
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
        const rows = state[name] as Array<Record<string, unknown>>;
        const kept = rows.filter((r) => !pred(r));
        (state[name] as Array<Record<string, unknown>>).length = 0;
        for (const r of kept)
          (state[name] as Array<Record<string, unknown>>).push(r);
      },
    };
  }

  return {
    db: {
      insert,
      select,
      update,
      delete: del,
    },
    state,
  };
}

// We need to intercept the drizzle eq() helper so our fake `where()`
// receives a row-predicate. The production code does
// `eq(table.storeId, storeId)`, where each column is an object built by
// drizzle. We replace `drizzle-orm` for tests via vi.mock so eq becomes
// `(col, val) => (row) => row[col.field] === val`.
vi.mock("drizzle-orm", () => ({
  eq:
    (col: { field: string }, val: unknown) =>
    (row: Record<string, unknown>) =>
      row[col.field] === val,
  sql: () => ({}),
}));

// Replace the real schema with markers our fake can identify. Each
// "column" in the marker carries its property name in `field` so the
// mocked eq() above can read it back from a row.
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
    },
  };
});

/**
 * Helper to build a `Response`-ish object suitable for our fetchImpl.
 */
function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseTrayDate", () => {
  it("parses Tray's `YYYY-MM-DD HH:mm:ss` format", () => {
    const d = parseTrayDate("2030-01-02 03:04:05");
    expect(d.toISOString()).toBe("2030-01-02T03:04:05.000Z");
  });
});

describe("exchangeCodeForTokens", () => {
  it("POSTs form-encoded credentials to Tray /auth", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.tray.com/auth");
      expect(init?.method).toBe("POST");
      const body = String(init?.body);
      expect(body).toContain("consumer_key=ck");
      expect(body).toContain("consumer_secret=cs");
      expect(body).toContain("code=abc");
      return jsonResponse({
        access_token: "at",
        refresh_token: "rt",
        date_expiration_access_token: "2030-01-01 00:00:00",
        date_expiration_refresh_token: "2030-06-01 00:00:00",
        store_id: 999,
      });
    });

    const res = await exchangeCodeForTokens({
      apiAddress: "https://api.tray.com",
      consumerKey: "ck",
      consumerSecret: "cs",
      code: "abc",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.access_token).toBe("at");
    expect(res.store_id).toBe("999");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe("completeInstall (callback persistence)", () => {
  it("persists store, tokens, and a hashed mcp session", async () => {
    const { db, state } = makeFakeDb();

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        date_expiration_access_token: "2030-01-01 00:00:00",
        date_expiration_refresh_token: "2030-06-01 00:00:00",
        store_id: "12345",
      }),
    );

    const result = await completeInstall({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db: db as any,
      apiAddress: "https://api.tray.com",
      code: "the-code",
      consumerKey: "ck",
      consumerSecret: "cs",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(state.stores).toHaveLength(1);
    expect(state.stores[0]!.trayStoreId).toBe("12345");
    expect(state.stores[0]!.apiAddress).toBe("https://api.tray.com");

    expect(state.oauthTokens).toHaveLength(1);
    expect(state.oauthTokens[0]!.accessToken).toBe("new-access");
    expect(state.oauthTokens[0]!.refreshToken).toBe("new-refresh");
    expect(state.oauthTokens[0]!.accessExpiresAt.toISOString()).toBe(
      "2030-01-01T00:00:00.000Z",
    );

    expect(state.mcpSessions).toHaveLength(1);
    expect(state.mcpSessions[0]!.bearerHash).not.toBe(result.bearer);
    // bcrypt hashes start with $2
    expect(state.mcpSessions[0]!.bearerHash.startsWith("$2")).toBe(true);

    expect(result.bearer).toMatch(/^mcp_[0-9a-f-]{36}_[0-9a-f]{64}$/);
    expect(result.sessionId).toBe(state.mcpSessions[0]!.id);
    expect(result.storeId).toBe(state.stores[0]!.id);
  });
});

describe("refreshTokens", () => {
  it("GETs /auth?refresh_token=... and updates DB rows", async () => {
    const { db, state } = makeFakeDb();
    state.stores.push({
      id: "store-1",
      trayStoreId: "tray-1",
      apiAddress: "https://api.tray.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.oauthTokens.push({
      id: "tok-1",
      storeId: "store-1",
      accessToken: "old-access",
      refreshToken: "old-refresh",
      accessExpiresAt: new Date("2030-01-01T00:00:00Z"),
      refreshExpiresAt: new Date("2030-06-01T00:00:00Z"),
      updatedAt: new Date(),
    });

    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toBe(
        "https://api.tray.com/auth?refresh_token=old-refresh",
      );
      return jsonResponse({
        access_token: "fresh-access",
        refresh_token: "fresh-refresh",
        date_expiration_access_token: "2031-01-01 00:00:00",
        date_expiration_refresh_token: "2031-06-01 00:00:00",
      });
    });

    const out = await refreshTokens(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      "store-1",
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(out.accessToken).toBe("fresh-access");
    expect(state.oauthTokens[0]!.accessToken).toBe("fresh-access");
    expect(state.oauthTokens[0]!.refreshToken).toBe("fresh-refresh");
    expect(state.oauthTokens[0]!.accessExpiresAt.toISOString()).toBe(
      "2031-01-01T00:00:00.000Z",
    );
    expect(state.oauthTokens[0]!.refreshExpiresAt.toISOString()).toBe(
      "2031-06-01T00:00:00.000Z",
    );
  });
});

describe("getValidAccessToken", () => {
  function seed(state: ReturnType<typeof makeFakeDb>["state"], expires: Date) {
    state.stores.push({
      id: "store-1",
      trayStoreId: "tray-1",
      apiAddress: "https://api.tray.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    state.oauthTokens.push({
      id: "tok-1",
      storeId: "store-1",
      accessToken: "current-access",
      refreshToken: "current-refresh",
      accessExpiresAt: expires,
      refreshExpiresAt: new Date("2030-06-01T00:00:00Z"),
      updatedAt: new Date(),
    });
  }

  it("returns the existing token when expiry is comfortably in the future", async () => {
    const { db, state } = makeFakeDb();
    const now = new Date("2030-01-01T00:00:00Z");
    seed(state, new Date(now.getTime() + 60 * 60 * 1000)); // +1h

    const fetchImpl = vi.fn();
    const token = await getValidAccessToken(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      "store-1",
      { now, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(token).toBe("current-access");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refreshes when access token expires in <10min", async () => {
    const { db, state } = makeFakeDb();
    const now = new Date("2030-01-01T00:00:00Z");
    seed(state, new Date(now.getTime() + 5 * 60 * 1000)); // +5min

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        access_token: "refreshed-access",
        refresh_token: "refreshed-refresh",
        date_expiration_access_token: "2031-01-01 00:00:00",
        date_expiration_refresh_token: "2031-06-01 00:00:00",
      }),
    );

    const token = await getValidAccessToken(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      "store-1",
      { now, fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(token).toBe("refreshed-access");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(state.oauthTokens[0]!.accessToken).toBe("refreshed-access");
  });
});
