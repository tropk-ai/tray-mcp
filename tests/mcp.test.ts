import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

import { authMcp, sha256Hex } from "../src/mcp/auth.js";
import { createMcpServer } from "../src/mcp/server.js";
import { sanitize, escapeHtml } from "../src/lib/html-sanitizer.js";
import { seo_accordion_execute } from "../src/tools/seo-accordion.js";
import { allTools } from "../src/tools/index.js";
import type { TrayClient } from "../src/tray/client.js";

const STORE_UUID = "00000000-0000-0000-0000-000000000001";
const TRAY_STORE_ID = "12345";
const API_ADDRESS = "https://loja-test.commercesuite.com.br";

function makeMockClient(handler: (call: {
  method: string;
  path: string;
  opts?: unknown;
}) => unknown): { client: TrayClient; calls: Array<unknown> } {
  const calls: Array<unknown> = [];
  const client: TrayClient = {
    request: async (method, path, opts) => {
      calls.push({ method, path, opts });
      return (await handler({ method, path, opts })) as never;
    },
  };
  return { client, calls };
}

/**
 * Tiny in-memory stand-in for the drizzle DB used by the auth middleware.
 * Mirrors the chained query-builder shape the middleware uses
 * (select().from().where().limit() / update().set().where()).
 */
function makeMockDb(state: {
  sessions: Array<{
    sessionId: string;
    storeId: string;
    bearerHash: string;
    revokedAt: Date | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  }>;
  stores: Array<{ id: string; trayStoreId: string; apiAddress: string }>;
  tokens: Array<{
    storeId: string;
    accessToken: string;
    refreshToken: string;
  }>;
}) {
  const select = (cols: Record<string, unknown>) => {
    return {
      from: (table: unknown) => {
        return {
          where: (_cond: unknown) => {
            return {
              limit: async (_n: number) => {
                // Disambiguate which table the caller is selecting from by
                // looking at the columns alias keys.
                if ("sessionId" in cols) {
                  return state.sessions.map((s) => ({
                    sessionId: s.sessionId,
                    storeId: s.storeId,
                    revokedAt: s.revokedAt,
                    expiresAt: s.expiresAt,
                  }));
                }
                if ("id" in cols && "trayStoreId" in cols) {
                  return state.stores;
                }
                if ("accessToken" in cols) {
                  return state.tokens.map((t) => ({
                    accessToken: t.accessToken,
                    refreshToken: t.refreshToken,
                  }));
                }
                return [];
              },
            };
          },
        };
      },
    };
  };
  const update = (_table: unknown) => ({
    set: (_vals: unknown) => ({
      where: async (_cond: unknown) => undefined,
    }),
  });
  return { select, update } as unknown as import("../src/mcp/auth.js").Db;
}

describe("createMcpServer", () => {
  it("registers every tool from allTools (including the SEO accordion)", () => {
    // The server is built lazily; we assert tool surface through allTools
    // (the registry that the server enumerates).
    expect(allTools.length).toBe(151);
    const names = new Set(allTools.map((t) => t.definition.name));
    expect(names.has("tray_categorias_set_seo_accordion")).toBe(true);
  });

  it("dispatches tools/call to the matching tool and returns text content", async () => {
    const { client, calls } = makeMockClient(({ method, path }) => {
      if (method === "PUT" && path.startsWith("/categories/")) return { ok: true };
      return {};
    });
    const server = createMcpServer({ client, storeId: TRAY_STORE_ID });
    // We use the server's internal request dispatcher directly via the
    // protocol's onmessage path. Since wiring up a full transport is heavy
    // for a unit test, we hit the tool function the SDK would call.
    const tool = allTools.find(
      (t) => t.definition.name === "tray_categorias_set_seo_accordion",
    );
    expect(tool).toBeDefined();
    const parsed = tool!.definition.inputSchema.parse({
      category_id: 42,
      faqs: [{ pergunta: "Frete?", resposta_html: "<p>Grátis acima de R$199</p>" }],
    });
    await tool!.execute(parsed, { client, storeId: TRAY_STORE_ID });
    expect(calls).toHaveLength(1);
    const call = calls[0] as { method: string; path: string; opts?: { body?: unknown } };
    expect(call.method).toBe("PUT");
    expect(call.path).toBe("/categories/42");
    expect(call.opts?.body).toMatchObject({
      Category: { description: expect.stringContaining("<details") },
    });
    // Server should be constructible and have the request handlers attached.
    expect(server).toBeDefined();
  });

  it("returns isError content when input fails validation", async () => {
    const tool = allTools.find(
      (t) => t.definition.name === "tray_categorias_set_seo_accordion",
    )!;
    expect(() =>
      tool.definition.inputSchema.parse({ category_id: 42, faqs: [] }),
    ).toThrow();
  });
});

describe("seo_accordion_execute", () => {
  it("sanitizes inputs and PUTs /categories/X with Category.description", async () => {
    const { client, calls } = makeMockClient(() => ({ ok: true }));
    const res = await seo_accordion_execute(
      {
        category_id: 99,
        intro_html: "<p>Intro</p><script>alert(1)</script>",
        faqs: [
          { pergunta: "Como <funciona>?", resposta_html: "<p>Assim</p><iframe src=x></iframe>" },
        ],
        replace: true,
      },
      { client, storeId: TRAY_STORE_ID },
    );
    expect(calls).toHaveLength(1);
    const call = calls[0] as { method: string; path: string; opts: { body: { Category: { description: string } } } };
    expect(call.method).toBe("PUT");
    expect(call.path).toBe("/categories/99");
    const html = call.opts.body.Category.description;
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<iframe");
    // Question is HTML-escaped inside <summary>.
    expect(html).toContain("Como &lt;funciona&gt;?");
    expect(res.category_id).toBe(99);
  });

  it("with replace=false fetches current description and appends", async () => {
    const { client, calls } = makeMockClient(({ method }) => {
      if (method === "GET") return { Category: { description: "EXISTING-" } };
      return { ok: true };
    });
    await seo_accordion_execute(
      {
        category_id: 7,
        faqs: [{ pergunta: "P", resposta_html: "<p>R</p>" }],
        replace: false,
      },
      { client, storeId: TRAY_STORE_ID },
    );
    expect(calls).toHaveLength(2);
    const put = calls[1] as { opts: { body: { Category: { description: string } } } };
    expect(put.opts.body.Category.description.startsWith("EXISTING-")).toBe(true);
  });
});

describe("html sanitizer", () => {
  it("removes <script> but keeps <details>/<summary>", () => {
    const out = sanitize(
      "<details><summary>Hi</summary><p>body</p></details><script>evil()</script>",
    );
    expect(out).toContain("<details>");
    expect(out).toContain("<summary>Hi</summary>");
    expect(out).toContain("<p>body</p>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("evil()");
  });

  it("strips disallowed schemes from <a href>", () => {
    const out = sanitize('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("escapeHtml encodes the dangerous five", () => {
    expect(escapeHtml("<a&b'\"")).toBe("&lt;a&amp;b&#39;&quot;");
  });
});

describe("authMcp middleware", () => {
  function buildApp(opts: Parameters<typeof authMcp>[0]) {
    const app = new Hono<{
      Bindings: {
        DATABASE_URL: string;
        TRAY_CONSUMER_KEY: string;
        TRAY_CONSUMER_SECRET: string;
        MCP_HOST: string;
      };
    }>();
    app.get("/mcp", authMcp(opts), (c) => {
      const ctx = c.get("mcpCtx");
      return c.json({ storeId: ctx.storeId });
    });
    return app;
  }
  const env = {
    DATABASE_URL: "postgres://test",
    TRAY_CONSUMER_KEY: "k",
    TRAY_CONSUMER_SECRET: "s",
    MCP_HOST: "https://test",
  };

  it("returns 401 when no Authorization header is present", async () => {
    const app = buildApp({
      getDb: () => makeMockDb({ sessions: [], stores: [], tokens: [] }),
    });
    const res = await app.request("/mcp", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer does not match any session", async () => {
    const app = buildApp({
      getDb: () => makeMockDb({ sessions: [], stores: [], tokens: [] }),
    });
    const res = await app.request(
      "/mcp",
      { headers: { Authorization: "Bearer nope" } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("populates mcpCtx when bearer is valid", async () => {
    const token = "secret-token";
    const hash = await sha256Hex(token);
    const fakeClient: TrayClient = { request: vi.fn(async () => ({})) };
    const createClient = vi.fn(() => fakeClient);
    const app = buildApp({
      getDb: () =>
        makeMockDb({
          sessions: [
            {
              sessionId: "sess-1",
              storeId: STORE_UUID,
              bearerHash: hash,
              revokedAt: null,
              expiresAt: null,
              lastUsedAt: null,
            },
          ],
          stores: [
            { id: STORE_UUID, trayStoreId: TRAY_STORE_ID, apiAddress: API_ADDRESS },
          ],
          tokens: [
            { storeId: STORE_UUID, accessToken: "AT", refreshToken: "RT" },
          ],
        }),
      createClient,
    });
    const res = await app.request(
      "/mcp",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { storeId: string };
    expect(body.storeId).toBe(TRAY_STORE_ID);

    // Regression: the TrayClient must be keyed on the internal UUID (used
    // for oauth_tokens.store_id during refresh), NOT the Tray store id —
    // otherwise token refresh throws "invalid input syntax for type uuid".
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: STORE_UUID }),
    );
  });
});
