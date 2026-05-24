import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../lib/db.js";
import { stores, webhookEvents } from "../db/schema.js";

/**
 * Schema for the JSON body Tray POSTs to our webhook endpoint.
 *
 * Tray's docs describe these fields for app/scope notifications. We accept
 * extra unknown keys so future fields don't break ingestion.
 */
export const webhookPayloadSchema = z
  .object({
    seller_id: z.union([z.string(), z.number()]).optional(),
    scope_id: z.union([z.string(), z.number()]).optional(),
    scope_name: z.string().min(1),
    act: z.string().min(1),
    app_code: z.union([z.string(), z.number()]).optional(),
    url_notification: z.string().optional(),
  })
  .passthrough();

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

/**
 * Resolves the path param (`:store_id`) to our internal `stores.id` UUID.
 *
 * Decision: the URL param can be either our internal UUID (preferred — we
 * generate the URL when registering the webhook with Tray during install)
 * or, as a fallback, the `tray_store_id`. We try UUID first, then fall back
 * to `tray_store_id`. If neither matches we return `null` — the caller will
 * still return 200 to Tray and log/audit the failure, because Tray will not
 * fix the request and retries would just create noise.
 */
async function resolveStoreId(
  db: Database,
  rawParam: string,
): Promise<string | null> {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRe.test(rawParam)) {
    const rows = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, rawParam))
      .limit(1);
    if (rows[0]) return rows[0].id;
  }

  const byTray = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.trayStoreId, rawParam))
    .limit(1);
  if (byTray[0]) return byTray[0].id;

  return null;
}

/**
 * Persist an incoming webhook event. Designed to be fast and forgiving:
 * any DB or validation error is swallowed (and logged) so that we never
 * block the 200 response that Tray requires within 1 second.
 */
export async function insertWebhookEvent(
  db: Database,
  storeIdParam: string,
  rawBody: unknown,
): Promise<void> {
  try {
    const parseResult = webhookPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error("[webhook] invalid payload", {
        store_id_param: storeIdParam,
        issues: parseResult.error.issues,
      });
      return;
    }
    const payload = parseResult.data;

    const internalStoreId = await resolveStoreId(db, storeIdParam);
    if (!internalStoreId) {
      console.error("[webhook] unknown store", {
        store_id_param: storeIdParam,
        scope_name: payload.scope_name,
        act: payload.act,
      });
      // Decision: drop the event when the store is unknown. We cannot
      // satisfy the FK on webhook_events.store_id, and storing it
      // anywhere else would just be an orphan log line. Tray won't
      // re-send a fixed payload, so persisting is pointless.
      return;
    }

    await db.insert(webhookEvents).values({
      storeId: internalStoreId,
      scopeName: payload.scope_name,
      act: payload.act,
      sellerId:
        payload.seller_id != null ? String(payload.seller_id) : null,
      payload: payload as unknown as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[webhook] insert failed", {
      store_id_param: storeIdParam,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Hono handler for POST /webhook/:store_id.
 *
 * Tray gives us a 1-second budget to respond. We respond 200 immediately
 * and defer the DB insert. On Cloudflare Workers we use
 * `c.executionCtx.waitUntil()` to keep the insert alive after the response
 * is sent. In environments without `executionCtx` (e.g. local tests) we
 * await the insert inline — it still has to finish fast for those tests
 * to pass, but it won't be lost.
 *
 * We always return `{ ok: true }` with status 200, even on validation or
 * DB error, because Tray will retry indefinitely on anything else and we
 * already have our own internal retry/dead-letter handling via
 * `webhook_events.error`.
 */
export function makeWebhookHandler(getDb: (env: unknown) => Database) {
  return async (c: Context) => {
    const storeIdParam = c.req.param("store_id") ?? "";
    let body: unknown = null;
    try {
      body = await c.req.json();
    } catch {
      console.error("[webhook] body is not valid JSON", {
        store_id_param: storeIdParam,
      });
      return c.json({ ok: true }, 200);
    }

    const db = getDb(c.env);
    const work = insertWebhookEvent(db, storeIdParam, body);

    // Hono's `c.executionCtx` getter throws when no ExecutionContext was
    // attached to the request (i.e. when not running on Workers). We treat
    // that as "no waitUntil available" and fall back to awaiting inline.
    let waitUntil:
      | ((p: Promise<unknown>) => void)
      | null = null;
    try {
      const ec = c.executionCtx as
        | { waitUntil?: (p: Promise<unknown>) => void }
        | undefined;
      if (ec && typeof ec.waitUntil === "function") {
        waitUntil = ec.waitUntil.bind(ec);
      }
    } catch {
      waitUntil = null;
    }

    if (waitUntil) {
      waitUntil(work);
    } else {
      await work;
    }

    return c.json({ ok: true }, 200);
  };
}
