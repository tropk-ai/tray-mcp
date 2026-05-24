// Shared helpers for the OAuth 2.1 provider endpoints.

const HEX = "0123456789abcdef";

/**
 * Encode bytes as lowercase hex.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    out += HEX[(b >> 4) & 0x0f]! + HEX[b & 0x0f]!;
  }
  return out;
}

/**
 * Encode bytes as base64url (RFC 4648 §5) without padding.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Generate `n` random bytes using the platform CSPRNG.
 */
export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/**
 * `n` random bytes encoded as lowercase hex.
 */
export function randomHex(n: number): string {
  return bytesToHex(randomBytes(n));
}

const TEXT_ENCODER = new TextEncoder();

/**
 * SHA-256(text) as lowercase hex.
 */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(text));
  return bytesToHex(new Uint8Array(buf));
}

/**
 * Compute the PKCE S256 transform: base64url(sha256(verifier)).
 */
export async function pkceS256(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    TEXT_ENCODER.encode(verifier),
  );
  return bytesToBase64Url(new Uint8Array(buf));
}

/**
 * Escape a string for safe embedding in an HTML attribute / text node.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip a trailing slash from a URL.
 */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Build a URL by appending a single query parameter (handling existing `?`).
 */
export function appendQuery(
  url: string,
  params: Record<string, string>,
): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  return u.toString();
}

/**
 * Resolve the HMAC secret used to sign `preauth_store` cookies.
 *
 * Prefer the dedicated `PREAUTH_SECRET` env var when set; otherwise fall
 * back to `TRAY_CONSUMER_SECRET` (always present in our deployment).
 *
 * Lives here (not in `../index.ts`) to avoid a circular import between
 * `authorize.ts` and the top-level app module.
 */
export function preauthSecret(env: {
  PREAUTH_SECRET?: string;
  TRAY_CONSUMER_SECRET: string;
}): string {
  return env.PREAUTH_SECRET || env.TRAY_CONSUMER_SECRET;
}

/**
 * HMAC-SHA256 a string with the given secret, returning lowercase hex.
 *
 * Uses Web Crypto so this works inside Cloudflare Workers, Bun, and
 * recent Node (>=20) without bringing in a polyfill.
 */
export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    TEXT_ENCODER.encode(message),
  );
  return bytesToHex(new Uint8Array(sig));
}

/**
 * Default lifetime for the `preauth_store` cookie: 10 minutes.
 *
 * Long enough for the merchant to click "Connect to Claude" and complete
 * a one-click connector add, short enough that a stolen cookie has near-
 * zero useful lifetime.
 */
export const DEFAULT_PREAUTH_TTL_MS = 10 * 60 * 1000;

/**
 * Sign a `preauth_store` cookie value.
 *
 * The merchant lands on `/install-success` after the legacy Tray install
 * flow completes. Before showing the page we drop an HMAC-signed cookie
 * naming their `store_id`. When they later hit `/authorize` from a
 * one-click connector add on claude.ai, the cookie lets us skip the
 * store-picker form.
 *
 * Format: `${storeId}.${expiresAtUnixMs}.${hmacHex}`.
 * The signature covers `${storeId}.${expiresAtUnixMs}`.
 */
export async function signPreauth(
  storeId: string,
  secret: string,
  options: { ttlMs?: number; nowMs?: number } = {},
): Promise<string> {
  const ttl = options.ttlMs ?? DEFAULT_PREAUTH_TTL_MS;
  const now = options.nowMs ?? Date.now();
  const expiresAt = now + ttl;
  const payload = `${storeId}.${expiresAt}`;
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}.${sig}`;
}

/**
 * Verify a `preauth_store` cookie value, returning the `storeId` if and
 * only if the signature is valid AND the cookie is not expired.
 *
 * Uses a constant-time string compare to avoid leaking byte-level
 * timing information about the HMAC.
 */
export async function verifyPreauth(
  cookie: string,
  secret: string,
  options: { nowMs?: number } = {},
): Promise<{ storeId: string } | null> {
  const now = options.nowMs ?? Date.now();
  if (typeof cookie !== "string" || cookie.length === 0) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [storeId, expiresAtStr, sig] = parts as [string, string, string];
  if (!storeId || !expiresAtStr || !sig) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  const expected = await hmacSha256Hex(secret, `${storeId}.${expiresAtStr}`);
  if (!constantTimeEqual(expected, sig)) return null;
  return { storeId };
}

/**
 * Constant-time equality check for two strings of equal length.
 *
 * Returns false fast if lengths differ (lengths are not secret here —
 * both sides are fixed-size SHA-256 hex digests).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
