import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";

import { mcpSessions, stores } from "../db/schema.js";
import type { Bindings } from "../index.js";
import { createDb, type Database } from "../lib/db.js";
import {
  DEFAULT_PREAUTH_TTL_MS,
  preauthSecret,
  signPreauth,
} from "../oauth-provider/util.js";

const successQuerySchema = z.object({
  session_id: z.string().min(1),
  token: z.string().min(1),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface SuccessDeps {
  /** Override the DB resolver — used by tests. */
  getDb?: (env: Bindings) => Database | Promise<Database>;
}

/**
 * GET /install-success — shown right after the legacy Tray install flow
 * completes. We do three things here:
 *
 *   1. Resolve the `store_id` from the `session_id` query param so we can
 *      drop a signed `preauth_store` cookie. This cookie powers the
 *      1-click connector flow on `/authorize` — it lets us skip the
 *      store-picker form when the merchant arrives via claude.ai
 *      immediately after install.
 *
 *   2. Render a prominent "Conectar ao Claude" CTA that opens
 *      `https://claude.ai/install-mcp?url=<our-mcp>&name=Tray%20<store>`
 *      in a new tab. Claude then discovers our OAuth metadata, registers,
 *      and redirects the merchant back to our `/authorize` — where the
 *      cookie kicks in.
 *
 *   3. Keep the legacy bearer copy/paste snippets below as a fallback
 *      for users who'd rather configure Claude manually.
 */
export function successHandlerWithDeps(
  deps: SuccessDeps = {},
): (c: Context<{ Bindings: Bindings }>) => Promise<Response> {
  const resolveDb =
    deps.getDb ?? ((env: Bindings) => createDb(env.DATABASE_URL));

  return async (c) => {
    const parsed = successQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.html(
        `<!doctype html><meta charset="utf-8"><title>Tray MCP</title>` +
          `<p>Sessão inválida. Reinstale o app para gerar um novo token.</p>`,
        400,
      );
    }

    const { session_id, token } = parsed.data;
    const mcpUrl = `${c.env.MCP_HOST.replace(/\/$/, "")}/mcp`;

    // Look up the store this session was issued for — we need the
    // store_id (UUID) to sign the preauth cookie, and the tray_store_id
    // to build a friendly connector name like "Tray - 123456".
    let storeId: string | null = null;
    let storeName: string | null = null;
    try {
      const db = await resolveDb(c.env);
      const rows = await db
        .select({
          storeId: mcpSessions.storeId,
          trayStoreId: stores.trayStoreId,
          ownerEmail: stores.ownerEmail,
        })
        .from(mcpSessions)
        .leftJoin(stores, eq(stores.id, mcpSessions.storeId))
        .where(eq(mcpSessions.id, session_id))
        .limit(1);
      const row = rows[0];
      if (row) {
        storeId = row.storeId;
        storeName = row.ownerEmail || row.trayStoreId || null;
      }
    } catch {
      // DB lookup failures shouldn't break the page — the bearer is
      // already minted and shown below. The 1-click button just won't
      // skip the picker, which is still functional.
    }

    if (storeId) {
      const secret = preauthSecret(c.env);
      const cookieValue = await signPreauth(storeId, secret);
      setCookie(c, "preauth_store", cookieValue, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        maxAge: Math.floor(DEFAULT_PREAUTH_TTL_MS / 1000),
      });
    }

    const friendlyStore = storeName ?? "Loja";
    const connectorName = `Tray - ${friendlyStore}`;
    const claudeInstallUrl =
      `https://claude.ai/install-mcp` +
      `?url=${encodeURIComponent(mcpUrl)}` +
      `&name=${encodeURIComponent(connectorName)}`;

    // Pre-build the three legacy connection snippets (collapsed under a
    // <details> below the 1-click CTA).
    const claudeWebSnippet = JSON.stringify(
      {
        mcpServers: {
          tray: {
            url: mcpUrl,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    );

    const claudeCodeCli = `claude mcp add --transport http tray ${mcpUrl} \\
  --header "Authorization: Bearer ${token}"`;

    const claudeDesktop = JSON.stringify(
      {
        mcpServers: {
          tray: {
            command: "npx",
            args: [
              "-y",
              "mcp-remote",
              mcpUrl,
              "--header",
              `Authorization:Bearer ${token}`,
            ],
          },
        },
      },
      null,
      2,
    );

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tray MCP — Instalado</title>
  <style>
    :root { color-scheme: light; --tray: #FF7900; --tray-dark: #E56D00; --tray-light: #FFF4EB; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f7f8fa;
      color: #1a1a1a;
    }
    .container { max-width: 720px; margin: 0 auto; }
    .card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
      padding: 2rem;
      margin-bottom: 1.25rem;
    }
    .hero {
      background: linear-gradient(135deg, #FFFFFF 0%, var(--tray-light) 100%);
      border: 1px solid #f0e4d6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 32px rgba(255,121,0,0.12);
      text-align: center;
    }
    .hero h1 { font-size: 1.6rem; margin: 0.25rem 0 0.5rem; letter-spacing: -0.01em; }
    .hero .eyebrow {
      display: inline-block; background: var(--tray); color: #fff;
      font-size: 0.7rem; letter-spacing: 0.10em; text-transform: uppercase;
      font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 0.75rem;
    }
    .hero p { color: #374151; margin: 0.5rem auto 1.5rem; max-width: 480px; line-height: 1.55; }
    .cta {
      display: inline-block;
      background: var(--tray);
      color: #ffffff !important;
      text-decoration: none;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      font-weight: 700;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(255, 121, 0, 0.35);
      transition: background 0.12s, transform 0.12s;
    }
    .cta:hover { background: var(--tray-dark); transform: translateY(-1px); }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      letter-spacing: -0.01em;
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
      letter-spacing: -0.005em;
    }
    p { color: #374151; line-height: 1.55; margin: 0.5rem 0; }
    label {
      display: block;
      font-size: 0.85rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0.75rem 0 0.35rem;
    }
    .row {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }
    .row input {
      flex: 1;
      padding: 0.55rem 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
      color: #111827;
    }
    button {
      cursor: pointer;
      padding: 0.55rem 0.9rem;
      background: #111827;
      color: #ffffff;
      border: 0;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
    }
    button:hover { background: #1f2937; }
    pre {
      margin: 0;
      padding: 0.85rem 1rem;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.825rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      line-height: 1.5;
    }
    .warn {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
      color: #92400e;
      padding: 0.85rem 1rem;
      border-radius: 6px;
      font-size: 0.925rem;
      margin: 1rem 0;
    }
    .ok {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #065f46;
      background: #d1fae5;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .session {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
      color: #6b7280;
    }
    details { margin-top: 0.5rem; }
    details summary {
      cursor: pointer;
      font-weight: 600;
      color: #4b5563;
      padding: 0.5rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card hero">
      <span class="eyebrow">App instalado · 1-clique</span>
      <h1>Conecte sua loja ao Claude agora</h1>
      <p>
        Sua loja Tray está pronta. Clique no botão abaixo para abrir o Claude com
        o conector já preenchido — basta confirmar e pronto, sem copiar token.
      </p>
      <a class="cta" href="${escapeHtml(claudeInstallUrl)}" target="_blank" rel="noopener">
        Conectar ao Claude
      </a>
      <p style="font-size:0.85rem;color:#6b7280;margin-top:1.25rem">
        Abre <code>claude.ai</code> em uma nova aba. Você precisa estar logado.
      </p>
    </div>

    <div class="card">
      <div class="ok">App instalado com sucesso</div>
      <h1>Como funciona o 1-clique</h1>
      <p>
        Ao clicar em <strong>Conectar ao Claude</strong>, o Claude descobre nosso
        servidor MCP automaticamente, registra-se via OAuth e te traz de volta
        para autorizar. Como você acabou de instalar pela Tray, pulamos a tela de
        seleção de loja e a conexão fica pronta na hora.
      </p>
      <p class="session">Session ID: ${escapeHtml(session_id)}</p>
    </div>

    <div class="card">
      <details>
        <summary>Prefere configurar manualmente? (legado — copiar bearer)</summary>
        <div class="warn" style="margin-top:1rem">
          <strong>Anote este token agora.</strong> Ele não será mostrado novamente.
          Se você perdê-lo, será necessário gerar um novo (e revogar este).
        </div>

        <label>URL do MCP</label>
        <div class="row">
          <input id="url" readonly value="${escapeHtml(mcpUrl)}">
          <button type="button" data-copy="url">Copiar</button>
        </div>

        <label>Bearer token</label>
        <div class="row">
          <input id="token" readonly value="${escapeHtml(token)}">
          <button type="button" data-copy="token">Copiar</button>
        </div>

        <h2 style="margin-top:1.5rem">claude.ai (Web)</h2>
        <p>Em <em>Settings → Connectors → Add custom connector</em>, cole:</p>
        <pre><code id="snip-web">${escapeHtml(claudeWebSnippet)}</code></pre>
        <button type="button" data-copy="snip-web" style="margin-top:0.5rem">Copiar</button>

        <h2 style="margin-top:1.5rem">Claude Code (CLI)</h2>
        <pre><code id="snip-cli">${escapeHtml(claudeCodeCli)}</code></pre>
        <button type="button" data-copy="snip-cli" style="margin-top:0.5rem">Copiar</button>

        <h2 style="margin-top:1.5rem">Claude Desktop</h2>
        <p>Adicione ao seu <code>claude_desktop_config.json</code>:</p>
        <pre><code id="snip-desktop">${escapeHtml(claudeDesktop)}</code></pre>
        <button type="button" data-copy="snip-desktop" style="margin-top:0.5rem">Copiar</button>
      </details>
    </div>
  </div>

  <script>
    document.querySelectorAll('button[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-copy');
        var el = document.getElementById(id);
        if (!el) return;
        var text = el.value !== undefined ? el.value : el.textContent;
        navigator.clipboard.writeText(text).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Copiado!';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        });
      });
    });
  </script>
</body>
</html>`;

    return c.html(html);
  };
}

/**
 * Default export for `app.get("/install-success", successHandler)` —
 * uses real DB resolver under the hood. Tests inject their own fake DB
 * via `successHandlerWithDeps`.
 */
export const successHandler = successHandlerWithDeps();
