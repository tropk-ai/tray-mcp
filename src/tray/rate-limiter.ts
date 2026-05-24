// Simple token-bucket rate limiter, in-memory, per store.
// Default: 180 requests / minute (Tray API limit).

export interface RateLimiterOptions {
  /** Maximum tokens (burst capacity). Defaults to 180. */
  capacity?: number;
  /** Refill window in milliseconds. Defaults to 60_000 (1 minute). */
  windowMs?: number;
  /** Sleep function (override for tests). Defaults to setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private readonly capacity: number;
  private readonly windowMs: number;
  private readonly refillPerMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly buckets = new Map<string, Bucket>();

  constructor(opts: RateLimiterOptions = {}) {
    this.capacity = opts.capacity ?? 180;
    this.windowMs = opts.windowMs ?? 60_000;
    this.refillPerMs = this.capacity / this.windowMs;
    this.sleep = opts.sleep ?? defaultSleep;
  }

  /**
   * Acquire one token for the given store. Awaits until a token is available.
   */
  async acquire(storeId: string): Promise<void> {
    // Loop to handle the case where multiple waiters race after a sleep.
    // We compute the wait time, sleep, then re-check.
    // This is acceptable because we use in-memory buckets per Worker isolate.
    // For multi-region/multi-isolate distribution, a Durable Object would be needed.
    while (true) {
      const bucket = this.getBucket(storeId);
      this.refill(bucket);
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return;
      }
      const tokensNeeded = 1 - bucket.tokens;
      const waitMs = Math.ceil(tokensNeeded / this.refillPerMs);
      await this.sleep(waitMs);
    }
  }

  /** Reset the bucket for a given store (mainly for tests). */
  reset(storeId: string): void {
    this.buckets.delete(storeId);
  }

  /** Reset all buckets (mainly for tests). */
  resetAll(): void {
    this.buckets.clear();
  }

  private getBucket(storeId: string): Bucket {
    let bucket = this.buckets.get(storeId);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: Date.now() };
      this.buckets.set(storeId, bucket);
    }
    return bucket;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed <= 0) return;
    const refill = elapsed * this.refillPerMs;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + refill);
    bucket.lastRefill = now;
  }
}
