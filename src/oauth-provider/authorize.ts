// GET /authorize — start of the OAuth 2.1 authorization code flow.
//
// claude.ai sends the merchant here with a PKCE challenge + client_id +
// state. We persist a `oauth_pending` row keyed on a fresh UUID and
// render a simple HTML page asking the merchant for their Tray store
// domain. The submit POSTs to /authorize/store-selected.

import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { z } from "zod";

import { oauthClients, oauthPending, stores } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";

import {
  appendQuery,
  escapeHtml,
  preauthSecret,
  randomHex,
  stripTrailingSlash,
  verifyPreauth,
} from "./util.js";

/**
 * Validated query params for GET /authorize.
 */
const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal("S256"),
  state: z.string().min(1),
  scope: z.string().optional(),
  /** Optional pre-selected Tray store domain — skips the picker page. */
  store: z.string().optional(),
});

export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>;

export interface AuthorizeDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
  /** Override the pending-record TTL (default: 10 minutes). */
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * Normalize a Tray store hostname: strip protocol + trailing slash.
 */
function normalizeStore(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Build the Tray `/auth.php` authorize URL for the chosen store.
 */
export function buildTrayAuthorizeUrl(params: {
  storeDomain: string;
  consumerKey: string;
  mcpHost: string;
  pendingId: string;
}): string {
  const callback =
    `${stripTrailingSlash(params.mcpHost)}/oauth/tray-callback` +
    `?pending=${encodeURIComponent(params.pendingId)}`;
  return (
    `https://${params.storeDomain}/auth.php?response_type=code` +
    `&consumer_key=${encodeURIComponent(params.consumerKey)}` +
    `&callback=${encodeURIComponent(callback)}`
  );
}

/**
 * Hono handler for GET /authorize.
 */
export function authorizeHandler(
  deps: AuthorizeDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));
  const ttlMs = deps.ttlMs ?? DEFAULT_TTL_MS;

  return async (c) => {
    const parsed = authorizeQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_request",
          error_description: parsed.error.message,
        },
        400,
      );
    }

    const q = parsed.data;
    const db = await resolveDb(c.env);

    // Confirm the client exists + the redirect_uri is allow-listed.
    const clientRows = await db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.clientId, q.client_id))
      .limit(1);
    const client = clientRows[0];
    if (!client) {
      return c.json(
        { error: "unauthorized_client", error_description: "unknown client_id" },
        400,
      );
    }
    const allowed = Array.isArray(client.redirectUris)
      ? (client.redirectUris as string[])
      : [];
    if (!allowed.includes(q.redirect_uri)) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "redirect_uri not registered for this client",
        },
        400,
      );
    }

    const pendingId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    await db.insert(oauthPending).values({
      id: pendingId,
      clientId: q.client_id,
      redirectUri: q.redirect_uri,
      state: q.state,
      codeChallenge: q.code_challenge,
      codeChallengeMethod: q.code_challenge_method,
      scope: q.scope ?? null,
      expiresAt,
    });

    // Fast-path 1: the merchant just installed via the Tray app store
    // and we dropped a signed `preauth_store` cookie on /install-success.
    // If present + valid we already know which store this is — skip the
    // picker AND the Tray /auth.php redirect (tokens are already in DB),
    // mint an mcp_code right here, and bounce straight back to the
    // OAuth client's redirect_uri.
    const preauthCookie = getCookie(c, "preauth_store");
    if (preauthCookie) {
      const verified = await verifyPreauth(
        preauthCookie,
        preauthSecret(c.env),
      );
      if (verified) {
        const storeRows = await db
          .select()
          .from(stores)
          .where(eq(stores.id, verified.storeId))
          .limit(1);
        const store = storeRows[0];
        if (store) {
          const mcpCode = `mcpc_${randomHex(32)}`;
          await db
            .update(oauthPending)
            .set({ mcpCode, storeId: store.id })
            .where(eq(oauthPending.id, pendingId));

          // One-shot: kill the cookie now so refreshing the redirect
          // URL or hitting /authorize again can't reuse it.
          deleteCookie(c, "preauth_store", { path: "/" });

          const redirect = appendQuery(q.redirect_uri, {
            code: mcpCode,
            state: q.state,
          });
          return c.redirect(redirect, 302);
        }
      }
    }

    // Fast-path 2: if the caller pre-selected a store, jump straight to Tray.
    if (q.store) {
      const storeDomain = normalizeStore(q.store);
      await db
        .update(oauthPending)
        .set({ trayStore: storeDomain })
        .where(eq(oauthPending.id, pendingId));
      const trayUrl = buildTrayAuthorizeUrl({
        storeDomain,
        consumerKey: c.env.TRAY_CONSUMER_KEY,
        mcpHost: c.env.MCP_HOST,
        pendingId,
      });
      return c.redirect(trayUrl, 302);
    }

    // Render the store-picker form.
    return c.html(renderStorePicker({ pendingId }));
  };
}

/**
 * Render the simple HTML form asking the merchant for their Tray store
 * domain. Posts to /authorize/store-selected.
 */
function renderStorePicker(params: { pendingId: string }): string {
  const pending = escapeHtml(params.pendingId);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tray MCP — Conectar loja</title>
  <style>
    :root { color-scheme: light; --tray: #FF7900; --tray-dark: #E56D00; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1.25rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #FFFFFF 0%, #FFF4EB 100%);
      color: #1a1a1a;
      min-height: 100vh;
    }
    .card {
      max-width: 480px;
      margin: 4rem auto 0;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 32px rgba(255,121,0,0.10);
      padding: 2rem 1.75rem;
      border: 1px solid #f0e4d6;
    }
    .brand {
      display: inline-flex; align-items: center; gap: 0.4rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.10em;
      color: var(--tray);
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .brand::before {
      content: "";
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--tray);
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.4rem;
      letter-spacing: -0.01em;
    }
    p { color: #374151; line-height: 1.55; margin: 0.5rem 0 1.25rem; }
    label {
      display: block;
      font-size: 0.78rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.35rem;
    }
    input[type=text] {
      width: 100%;
      padding: 0.7rem 0.85rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.95rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #fcfcfc;
      color: #111827;
      outline: none;
      transition: border-color 0.12s, box-shadow 0.12s;
    }
    input[type=text]:focus {
      border-color: var(--tray);
      box-shadow: 0 0 0 3px rgba(255,121,0,0.18);
      background: #ffffff;
    }
    button {
      cursor: pointer;
      width: 100%;
      padding: 0.85rem 1rem;
      background: var(--tray);
      color: #ffffff;
      border: 0;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      margin-top: 1.25rem;
      box-shadow: 0 4px 14px rgba(255, 121, 0, 0.3);
      transition: background 0.12s, transform 0.12s;
    }
    button:hover { background: var(--tray-dark); transform: translateY(-1px); }
    .hint {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.45;
    }
    .hint code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f3f4f6;
      padding: 0.05rem 0.35rem;
      border-radius: 3px;
      font-size: 0.78rem;
    }
  </style>
</head>
<body>
  <form class="card" method="post" action="/authorize/store-selected">
    <div class="brand">Tray MCP · OAuth</div>
    <h1>Conectar sua loja Tray</h1>
    <p>
      O Claude está pedindo permissão pra acessar sua loja via MCP.
      Informe o domínio da sua loja Tray para autorizar.
    </p>
    <input type="hidden" name="pending_id" value="${pending}">
    <label for="store">Domínio da sua loja Tray</label>
    <input
      id="store"
      name="store_domain"
      type="text"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      required
      placeholder="lojaXXX.commercesuite.com.br"
    >
    <p class="hint">
      Exemplo: <code>minhaloja.commercesuite.com.br</code>. Você será redirecionado
      para a página oficial da Tray para conceder permissão.
    </p>
    <button type="submit">Continuar</button>
  </form>
</body>
</html>`;
}

export { appendQuery, normalizeStore };
