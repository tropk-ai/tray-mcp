// POST /authorize/store-selected — the merchant has typed their Tray
// store domain into the picker form. We persist it on the pending row
// and redirect them to Tray's /auth.php to confirm permissions.

import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import { oauthPending } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";

import { buildTrayAuthorizeUrl, normalizeStore } from "./authorize.js";

const bodySchema = z.object({
  pending_id: z.string().min(1),
  store_domain: z.string().min(3),
});

export interface StoreSelectedDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
}

async function readForm(c: Context): Promise<Record<string, string>> {
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return (await c.req.json()) as Record<string, string>;
  }
  // Default: x-www-form-urlencoded.
  const form = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function storeSelectedHandler(
  deps: StoreSelectedDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));

  return async (c) => {
    let body: Record<string, string>;
    try {
      body = await readForm(c);
    } catch {
      return c.json({ error: "invalid_request" }, 400);
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", error_description: parsed.error.message },
        400,
      );
    }

    const db = await resolveDb(c.env);
    const rows = await db
      .select()
      .from(oauthPending)
      .where(eq(oauthPending.id, parsed.data.pending_id))
      .limit(1);
    const pending = rows[0];
    if (!pending) {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (pending.consumedAt) {
      return c.json({ error: "invalid_request" }, 400);
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      return c.json({ error: "invalid_request" }, 400);
    }

    const storeDomain = normalizeStore(parsed.data.store_domain);
    await db
      .update(oauthPending)
      .set({ trayStore: storeDomain })
      .where(eq(oauthPending.id, parsed.data.pending_id));

    const trayUrl = buildTrayAuthorizeUrl({
      storeDomain,
      consumerKey: c.env.TRAY_CONSUMER_KEY,
      mcpHost: c.env.MCP_HOST,
      pendingId: parsed.data.pending_id,
    });
    return c.redirect(trayUrl, 302);
  };
}
