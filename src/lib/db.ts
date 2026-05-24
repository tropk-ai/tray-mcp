import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema.js";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Build a drizzle client bound to the given Postgres connection string.
 *
 * We use the `postgres` driver in "prepare: false" mode so that the
 * Supabase transaction pooler accepts our connections from Cloudflare
 * Workers (the pooler does not support prepared statements).
 *
 * Callers should reuse the returned client across requests when possible,
 * but creating one per request is acceptable for Workers because the
 * `postgres` client lazily opens its socket.
 */
export function createDb(databaseUrl: string): Database {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });
  return drizzle(client, { schema });
}
