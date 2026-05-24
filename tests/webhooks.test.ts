import { describe, expect, it, beforeEach, vi } from "vitest";
import { Hono } from "hono";

/**
 * We mock `drizzle-orm`'s query helpers so we can drive a tiny in-memory
 * store. The receiver / processor use `eq`, `and`, `isNull`, `asc`,
 * `sql`, plus the drizzle "query builder" chain reached via `db.select()`
 * / `db.insert()` / `db.update()` / `db.transaction()` — those live on
 * the `Database` instance, which we replace wholesale with a hand-rolled
 * mock (`makeMockDb`) below. So the only thing we actually need from
 * drizzle-orm in tests is the helper functions, which we re-implement to
 * produce predicate-bearing tokens.
 */
vi.mock("drizzle-orm", () => {
  type FilterToken = {
    __pred: (row: Record<string, unknown>) => boolean;
  };
  type SortToken = {
    __sort: (a: Record<string, unknown>, b: Record<string, unknown>) => number;
  };

  function fieldOf(col: unknown): string | null {
    if (col && typeof col === "object" && "fieldAlias" in col) {
      return (col as { fieldAlias: string }).fieldAlias;
    }
    return null;
  }

  return {
    eq: (col: unknown, val: unknown): FilterToken => ({
      __pred: (row) => {
        const f = fieldOf(col);
        return f != null && row[f] === val;
      },
    }),
    and: (...args: FilterToken[]): FilterToken => ({
      __pred: (row) => args.every((a) => a && a.__pred && a.__pred(row)),
    }),
    isNull: (col: unknown): FilterToken => ({
      __pred: (row) => {
        const f = fieldOf(col);
        return f != null && row[f] == null;
      },
    }),
    asc: (col: unknown): SortToken => ({
      __sort: (a, b) => {
        const f = fieldOf(col);
        if (f == null) return 0;
        const av = a[f] as number | string | Date | null;
        const bv = b[f] as number | string | Date | null;
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        return av < bv ? -1 : av > bv ? 1 : 0;
      },
    }),
    sql: ((strings: TemplateStringsArray) => {
      if (strings.join("").trim() === "now()") {
        return { __nowMarker: true };
      }
      return { __sql: strings.join("") };
    }) as unknown,
  };
});

/**
 * Replace the schema module with table tokens that carry a `__tableName`
 * we can recognise plus columns that have a `fieldAlias`. The production
 * code only reads these as opaque values it then hands back to drizzle —
 * which we also mock — so this is safe.
 */
vi.mock("../src/db/schema.js", () => {
  function makeTable<T extends Record<string, string>>(
    name: "stores" | "webhookEvents",
    cols: T,
  ) {
    const table: Record<string, unknown> = { __tableName: name };
    for (const [tsName] of Object.entries(cols)) {
      table[tsName] = { fieldAlias: tsName };
    }
    return table;
  }
  return {
    stores: makeTable("stores", {
      id: "id",
      trayStoreId: "trayStoreId",
      apiAddress: "apiAddress",
      ownerEmail: "ownerEmail",
      plan: "plan",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }),
    webhookEvents: makeTable("webhookEvents", {
      id: "id",
      storeId: "storeId",
      scopeName: "scopeName",
      act: "act",
      sellerId: "sellerId",
      payload: "payload",
      receivedAt: "receivedAt",
      processedAt: "processedAt",
      error: "error",
    }),
  };
});

import type { Database } from "../src/lib/db.js";
import * as schemaMock from "../src/db/schema.js";
import { makeWebhookHandler } from "../src/webhooks/receiver.js";
import { processNextBatch } from "../src/webhooks/processor.js";

interface StoreRow {
  id: string;
  trayStoreId: string;
  apiAddress: string;
  ownerEmail: string | null;
  plan: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EventRow {
  id: string;
  storeId: string;
  scopeName: string;
  act: string;
  sellerId: string | null;
  payload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  error: string | null;
}

function makeMockDb(): {
  db: Database;
  state: { stores: StoreRow[]; webhookEvents: EventRow[] };
} {
  const state = {
    stores: [] as StoreRow[],
    webhookEvents: [] as EventRow[],
  };

  type Filter = (row: Record<string, unknown>) => boolean;
  type Sort = (a: Record<string, unknown>, b: Record<string, unknown>) => number;

  function tableNameOf(t: unknown): "stores" | "webhookEvents" | null {
    if (t === schemaMock.stores) return "stores";
    if (t === schemaMock.webhookEvents) return "webhookEvents";
    return null;
  }

  function rowsOf(name: "stores" | "webhookEvents") {
    return state[name] as unknown as Record<string, unknown>[];
  }

  function makeSelect(columns?: string[]) {
    return {
      from(t: unknown) {
        const tn = tableNameOf(t);
        if (!tn) throw new Error("unknown table");
        let filter: Filter = () => true;
        let sort: Sort | undefined;
        let limit: number | undefined;
        const chain = {
          where(node: unknown) {
            if (node && typeof node === "object" && "__pred" in node) {
              filter = (node as { __pred: Filter }).__pred;
            }
            return chain;
          },
          orderBy(o: unknown) {
            if (o && typeof o === "object" && "__sort" in o) {
              sort = (o as { __sort: Sort }).__sort;
            }
            return chain;
          },
          limit(n: number) {
            limit = n;
            return chain;
          },
          for() {
            return chain;
          },
          then(
            res: (rows: Record<string, unknown>[]) => unknown,
            rej?: (e: unknown) => unknown,
          ) {
            try {
              let result = rowsOf(tn).filter(filter);
              if (sort) result = [...result].sort(sort);
              if (limit != null) result = result.slice(0, limit);
              if (columns) {
                result = result.map((r) => {
                  const out: Record<string, unknown> = {};
                  for (const c of columns) out[c] = r[c];
                  return out;
                });
              }
              return Promise.resolve(result).then(res, rej);
            } catch (e) {
              return Promise.reject(e).then(res, rej);
            }
          },
        };
        return chain;
      },
    };
  }

  const dbImpl = {
    select(columnsObj?: Record<string, unknown>) {
      const cols = columnsObj ? Object.keys(columnsObj) : undefined;
      return makeSelect(cols);
    },
    insert(t: unknown) {
      const tn = tableNameOf(t);
      if (!tn) throw new Error("unknown table");
      return {
        values(v: Record<string, unknown> | Record<string, unknown>[]) {
          const list = Array.isArray(v) ? v : [v];
          for (const item of list) {
            if (tn === "stores") {
              const row: StoreRow = {
                id:
                  (item.id as string) ??
                  `00000000-0000-0000-0000-${String(state.stores.length + 1).padStart(12, "0")}`,
                trayStoreId: item.trayStoreId as string,
                apiAddress: item.apiAddress as string,
                ownerEmail: (item.ownerEmail as string | null) ?? null,
                plan: (item.plan as string | null) ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              state.stores.push(row);
            } else {
              const row: EventRow = {
                id:
                  (item.id as string | undefined) ??
                  `evt-${state.webhookEvents.length + 1}`,
                storeId: item.storeId as string,
                scopeName: item.scopeName as string,
                act: item.act as string,
                sellerId: (item.sellerId as string | null) ?? null,
                payload: item.payload,
                receivedAt: new Date(),
                processedAt: null,
                error: null,
              };
              state.webhookEvents.push(row);
            }
          }
          return Promise.resolve();
        },
      };
    },
    update(t: unknown) {
      const tn = tableNameOf(t);
      if (!tn) throw new Error("unknown table");
      return {
        set(patch: Record<string, unknown>) {
          return {
            where(node: unknown) {
              const filter: Filter =
                node && typeof node === "object" && "__pred" in node
                  ? (node as { __pred: Filter }).__pred
                  : () => true;
              for (const row of rowsOf(tn)) {
                if (filter(row)) {
                  for (const [k, v] of Object.entries(patch)) {
                    let val: unknown = v;
                    if (
                      v &&
                      typeof v === "object" &&
                      "__nowMarker" in (v as Record<string, unknown>)
                    ) {
                      val = new Date();
                    }
                    (row as Record<string, unknown>)[k] = val;
                  }
                }
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    transaction(_cb: (tx: unknown) => Promise<unknown>): Promise<unknown> {
      // Force the processor's fallback path: pretend tx isn't supported.
      return Promise.reject(new Error("tx not supported in mock"));
    },
  };

  return { db: dbImpl as unknown as Database, state };
}

function seedStore(state: { stores: StoreRow[] }): StoreRow {
  const s: StoreRow = {
    id: "11111111-1111-1111-1111-111111111111",
    trayStoreId: "999",
    apiAddress: "https://example.tray.com.br",
    ownerEmail: null,
    plan: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  state.stores.push(s);
  return s;
}

function makeApp(db: Database) {
  const app = new Hono();
  app.post("/webhook/:store_id", makeWebhookHandler(() => db));
  return app;
}

describe("webhook receiver", () => {
  let mock: ReturnType<typeof makeMockDb>;
  beforeEach(() => {
    mock = makeMockDb();
    seedStore(mock.state);
  });

  it("returns 200 and stores the event for a valid payload (UUID param)", async () => {
    const app = makeApp(mock.db);
    const res = await app.request(
      "/webhook/11111111-1111-1111-1111-111111111111",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seller_id: 42,
          scope_id: "1",
          scope_name: "order",
          act: "insert",
          app_code: "abc",
          url_notification: "https://x",
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mock.state.webhookEvents).toHaveLength(1);
    expect(mock.state.webhookEvents[0].scopeName).toBe("order");
    expect(mock.state.webhookEvents[0].act).toBe("insert");
    expect(mock.state.webhookEvents[0].sellerId).toBe("42");
    expect(mock.state.webhookEvents[0].storeId).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("accepts a tray_store_id fallback in the path", async () => {
    const app = makeApp(mock.db);
    const res = await app.request("/webhook/999", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope_name: "product",
        act: "update",
      }),
    });
    expect(res.status).toBe(200);
    expect(mock.state.webhookEvents).toHaveLength(1);
    expect(mock.state.webhookEvents[0].storeId).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("returns 200 (and drops) on invalid payload", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = makeApp(mock.db);
    const res = await app.request(
      "/webhook/11111111-1111-1111-1111-111111111111",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ not_a_real_field: true }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mock.state.webhookEvents).toHaveLength(0);
    errSpy.mockRestore();
  });

  it("returns 200 for an unknown store_id (dropped, logged)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = makeApp(mock.db);
    const res = await app.request("/webhook/unknown-store", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope_name: "order",
        act: "insert",
      }),
    });
    expect(res.status).toBe(200);
    expect(mock.state.webhookEvents).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("responds in under 500ms even with synchronous DB", async () => {
    const app = makeApp(mock.db);
    const start = performance.now();
    const res = await app.request(
      "/webhook/11111111-1111-1111-1111-111111111111",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope_name: "order",
          act: "insert",
        }),
      },
    );
    const elapsed = performance.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  it("uses executionCtx.waitUntil when available (Workers fast-path)", async () => {
    const app = new Hono();
    app.post("/webhook/:store_id", makeWebhookHandler(() => mock.db));

    let deferred: Promise<unknown> | null = null;
    const ctx = {
      waitUntil(p: Promise<unknown>) {
        deferred = p;
      },
    };

    const res = await app.request(
      "/webhook/11111111-1111-1111-1111-111111111111",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope_name: "order",
          act: "insert",
        }),
      },
      undefined,
      ctx as unknown as ExecutionContext,
    );

    expect(res.status).toBe(200);
    expect(deferred).not.toBeNull();
    await deferred;
    expect(mock.state.webhookEvents).toHaveLength(1);
  });
});

describe("webhook processor", () => {
  let mock: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mock = makeMockDb();
    seedStore(mock.state);
  });

  it("processes pending events and marks processed_at", async () => {
    const now = new Date();
    mock.state.webhookEvents.push(
      {
        id: "evt-1",
        storeId: "11111111-1111-1111-1111-111111111111",
        scopeName: "order",
        act: "insert",
        sellerId: "1",
        payload: { scope_name: "order", act: "insert" },
        receivedAt: new Date(now.getTime() - 1000),
        processedAt: null,
        error: null,
      },
      {
        id: "evt-2",
        storeId: "11111111-1111-1111-1111-111111111111",
        scopeName: "product",
        act: "update",
        sellerId: "1",
        payload: { scope_name: "product", act: "update" },
        receivedAt: now,
        processedAt: null,
        error: null,
      },
      // Already processed: must be skipped.
      {
        id: "evt-3",
        storeId: "11111111-1111-1111-1111-111111111111",
        scopeName: "order",
        act: "update",
        sellerId: "1",
        payload: { scope_name: "order", act: "update" },
        receivedAt: new Date(now.getTime() - 2000),
        processedAt: now,
        error: null,
      },
    );

    const result = await processNextBatch(mock.db);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);

    const evt1 = mock.state.webhookEvents.find((e) => e.id === "evt-1");
    const evt2 = mock.state.webhookEvents.find((e) => e.id === "evt-2");
    expect(evt1?.processedAt).toBeInstanceOf(Date);
    expect(evt2?.processedAt).toBeInstanceOf(Date);
  });

  it("filters by storeFilter when provided", async () => {
    mock.state.stores.push({
      id: "22222222-2222-2222-2222-222222222222",
      trayStoreId: "888",
      apiAddress: "https://other.tray.com.br",
      ownerEmail: null,
      plan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mock.state.webhookEvents.push(
      {
        id: "evt-a",
        storeId: "11111111-1111-1111-1111-111111111111",
        scopeName: "order",
        act: "insert",
        sellerId: null,
        payload: {},
        receivedAt: new Date(),
        processedAt: null,
        error: null,
      },
      {
        id: "evt-b",
        storeId: "22222222-2222-2222-2222-222222222222",
        scopeName: "order",
        act: "insert",
        sellerId: null,
        payload: {},
        receivedAt: new Date(),
        processedAt: null,
        error: null,
      },
    );

    const result = await processNextBatch(mock.db, {
      storeFilter: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.processed).toBe(1);
    const a = mock.state.webhookEvents.find((e) => e.id === "evt-a");
    const b = mock.state.webhookEvents.find((e) => e.id === "evt-b");
    expect(a?.processedAt).toBeInstanceOf(Date);
    expect(b?.processedAt).toBeNull();
  });
});
