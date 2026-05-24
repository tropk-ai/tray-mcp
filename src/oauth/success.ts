import type { Context } from "hono";
import { z } from "zod";

import type { Bindings } from "../index.js";

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

/**
 * GET /install-success — shows the merchant their freshly issued MCP
 * bearer token together with copy-paste config snippets for the most
 * common MCP clients.
 *
 * The token only appears in the URL on the first redirect from
 * `/oauth/callback`. We do not persist it anywhere readable; if the
 * merchant loses it they have to regenerate.
 */
export async function successHandler(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
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

  // Pre-build the three connection snippets. We HTML-escape every
  // substitution but render the snippets inside <pre><code> blocks so
  // the user can copy verbatim.
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
          args: ["-y", "mcp-remote", mcpUrl, "--header", `Authorization:Bearer ${token}`],
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
    :root { color-scheme: light; }
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
  </style>
</head>
<body>
  <div class="container">
    <div class="card" style="border-left:4px solid #FF7900;background:#FFFAF3">
      <h2 style="margin-bottom:0.5rem">⚡ Conexão 1-click no Claude (recomendado)</h2>
      <p>
        Em vez de copiar/colar o bearer manual, basta colar a URL do MCP no
        <strong>claude.ai → Settings → Connectors → Add custom connector</strong>.
        O Claude pede autorização automaticamente — sem token.
      </p>
      <label>URL do MCP (1-click)</label>
      <div class="row">
        <input id="url-oneclick" readonly value="${escapeHtml(mcpUrl)}">
        <button type="button" data-copy="url-oneclick">Copiar</button>
      </div>
    </div>

    <div class="card">
      <div class="ok">✅ App instalado com sucesso</div>
      <h1>Seu servidor MCP está pronto</h1>
      <p>Use os dados abaixo para conectar seu assistente de IA à sua loja Tray.</p>

      <div class="warn">
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

      <p class="session">Session ID: ${escapeHtml(session_id)}</p>
    </div>

    <div class="card">
      <h2>claude.ai (Web)</h2>
      <p>Em <em>Settings → Connectors → Add custom connector</em>, cole:</p>
      <pre><code id="snip-web">${escapeHtml(claudeWebSnippet)}</code></pre>
      <button type="button" data-copy="snip-web" style="margin-top:0.5rem">Copiar</button>
    </div>

    <div class="card">
      <h2>Claude Code (CLI)</h2>
      <pre><code id="snip-cli">${escapeHtml(claudeCodeCli)}</code></pre>
      <button type="button" data-copy="snip-cli" style="margin-top:0.5rem">Copiar</button>
    </div>

    <div class="card">
      <h2>Claude Desktop</h2>
      <p>Adicione ao seu <code>claude_desktop_config.json</code>:</p>
      <pre><code id="snip-desktop">${escapeHtml(claudeDesktop)}</code></pre>
      <button type="button" data-copy="snip-desktop" style="margin-top:0.5rem">Copiar</button>
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
}
