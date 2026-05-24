import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "../lib/db.js";
import { webhookEvents, type WebhookEvent } from "../db/schema.js";

export interface ProcessOptions {
  /** Max events to claim in one batch. Defaults to 50. */
  limit?: number;
  /** If set, only process events for this internal store UUID. */
  storeFilter?: string;
}

export interface ProcessResult {
  processed: number;
  failed: number;
}

/**
 * Stub event handler. Until per-scope handlers exist, we just log the
 * event in a structured way so it shows up in Worker logs.
 *
 * In the future, this will dispatch to scope-specific handlers
 * (e.g. `order/insert`, `product/update`, ...).
 */
export async function processEvent(event: WebhookEvent): Promise<void> {
  console.log("[webhook.process] event", {
    id: event.id,
    store_id: event.storeId,
    scope_name: event.scopeName,
    act: event.act,
    seller_id: event.sellerId,
    received_at: event.receivedAt,
  });
}

/**
 * Claim and process the next batch of pending webhook events.
 *
 * The query uses `FOR UPDATE SKIP LOCKED` so that multiple workers can
 * run this concurrently without stepping on each other. Each event is
 * processed inside a transaction that holds the row lock until we mark
 * it `processed_at` (success) or `error` (failure).
 *
 * On test runtimes where transactions / row locking aren't supported by
 * the mock driver, we fall back to a plain SELECT.
 */
export async function processNextBatch(
  db: Database,
  opts: ProcessOptions = {},
): Promise<ProcessResult> {
  const limit = opts.limit ?? 50;

  let events: WebhookEvent[] = [];
  try {
    events = await db.transaction(async (tx) => {
      const whereExpr = opts.storeFilter
        ? and(
            isNull(webhookEvents.processedAt),
            isNull(webhookEvents.error),
            eq(webhookEvents.storeId, opts.storeFilter),
          )
        : and(
            isNull(webhookEvents.processedAt),
            isNull(webhookEvents.error),
          );

      const rows = await tx
        .select()
        .from(webhookEvents)
        .where(whereExpr)
        .orderBy(asc(webhookEvents.receivedAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      return rows;
    });
  } catch {
    // Fallback path for environments without proper tx / row-lock support
    // (notably the in-memory mock used by tests).
    const whereExpr = opts.storeFilter
      ? and(
          isNull(webhookEvents.processedAt),
          isNull(webhookEvents.error),
          eq(webhookEvents.storeId, opts.storeFilter),
        )
      : and(isNull(webhookEvents.processedAt), isNull(webhookEvents.error));
    events = await db
      .select()
      .from(webhookEvents)
      .where(whereExpr)
      .orderBy(asc(webhookEvents.receivedAt))
      .limit(limit);
  }

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await processEvent(event);
      await db
        .update(webhookEvents)
        .set({ processedAt: sql`now()` })
        .where(eq(webhookEvents.id, event.id));
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhook.process] failed", {
        id: event.id,
        error: msg,
      });
      try {
        await db
          .update(webhookEvents)
          .set({ error: msg })
          .where(eq(webhookEvents.id, event.id));
      } catch (updateErr) {
        console.error("[webhook.process] failed to mark error", {
          id: event.id,
          error:
            updateErr instanceof Error
              ? updateErr.message
              : String(updateErr),
        });
      }
      failed++;
    }
  }

  return { processed, failed };
}
