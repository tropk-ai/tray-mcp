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
