import type { Context } from "hono";
import { z } from "zod";

import type { Bindings } from "../index.js";

/**
 * Query schema for the install entrypoint. Tray opens this URL inside an
 * iframe in the merchant's admin panel and passes the store domain as
 * `store`. We accept either the full URL or just the hostname.
 */
const installQuerySchema = z.object({
  store: z
    .string()
    .min(1, "store query param is required")
    .transform((s) => s.replace(/^https?:\/\//, "").replace(/\/$/, "")),
});

/**
 * Escape a string for safe embedding in an HTML attribute / text node.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * GET /oauth/install — renders the landing page that the merchant sees
 * inside the Tray admin iframe. The "Autorizar acesso" button triggers
 * Tray's `/auth.php?response_type=code&...` flow which redirects the
 * browser back to our `/oauth/callback` with a short-lived `code`.
 */
export async function installHandler(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const parsed = installQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.html(
      `<!doctype html><meta charset="utf-8"><title>Tray MCP — erro</title>` +
        `<p>Parâmetros inválidos: ${escapeHtml(parsed.error.message)}</p>`,
      400,
    );
  }

  const { store } = parsed.data;
  const { TRAY_CONSUMER_KEY, MCP_HOST } = c.env;

  const callback = `${MCP_HOST}/oauth/callback`;
  const authorizeUrl =
    `https://${store}/auth.php?response_type=code` +
    `&consumer_key=${encodeURIComponent(TRAY_CONSUMER_KEY)}` +
    `&callback=${encodeURIComponent(callback)}`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tray MCP — Autorizar instalação</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f7f8fa;
      color: #1a1a1a;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
      padding: 2rem;
    }
    h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      letter-spacing: -0.01em;
    }
    .brand {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      font-weight: 600;
    }
    p {
      color: #374151;
      line-height: 1.55;
      margin: 1rem 0;
    }
    ul {
      color: #374151;
      padding-left: 1.25rem;
      line-height: 1.55;
    }
    .cta {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.85rem 1.5rem;
      background: #111827;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
    }
    .cta:hover { background: #1f2937; }
    .store {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      background: #f3f4f6;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Tray MCP</div>
    <h1>Conecte sua loja Tray ao Claude</h1>
    <p>
      Esta integração permite que assistentes de IA compatíveis com MCP
      (Claude, Cursor, etc.) leiam e gerenciem produtos, pedidos, clientes
      e configurações da sua loja
      <span class="store">${escapeHtml(store)}</span> via API oficial da Tray.
    </p>
    <p><strong>Ao autorizar você concede acesso a:</strong></p>
    <ul>
      <li>Catálogo (produtos, variações, categorias, marcas)</li>
      <li>Pedidos, clientes e endereços</li>
      <li>Configurações de frete, pagamento e webhooks</li>
    </ul>
    <a class="cta" href="${escapeHtml(authorizeUrl)}">Autorizar acesso</a>
  </div>
</body>
</html>`;

  return c.html(html, 200, {
    "X-Frame-Options": "ALLOWALL",
    "Content-Security-Policy":
      "frame-ancestors *.commercesuite.com.br *.tray.com.br",
  });
}
