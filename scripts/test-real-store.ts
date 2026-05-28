/**
 * Teste manual contra uma loja Tray REAL.
 *
 * Este ambiente (Claude Code on the web) bloqueia rede externa, então rode
 * ESTE script na SUA máquina:
 *
 *   npm run test:real
 *
 * Ele:
 *   1. Lê TRAY_CONSUMER_KEY / TRAY_CONSUMER_SECRET / TRAY_TEST_STORE do .dev.vars
 *   2. Imprime a URL do auth.php pra você abrir no navegador (logado no admin da loja)
 *   3. Você autoriza; a Tray redireciona pra um callback. Cole a URL final aqui.
 *   4. Troca o `code` por tokens (mesma função do servidor: exchangeCodeForTokens)
 *   5. Monta o TrayHttpClient real e roda chamadas de leitura
 *   6. (Opcional) testa a tool tray_categorias_set_seo_accordion numa categoria
 *
 * Não precisa de banco de dados nem deploy — é um teste direto do cliente Tray.
 */

import { createInterface, type Interface } from "node:readline";
import { readFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";

import { exchangeCodeForTokens } from "../src/oauth/callback.js";
import { TrayHttpClient } from "../src/tray/client.js";
import { RateLimiter } from "../src/tray/rate-limiter.js";
import { seo_accordion_execute } from "../src/tools/seo-accordion.js";

/** Lê .dev.vars (formato KEY=value) e mescla em process.env sem sobrescrever o que já existe. */
function loadDevVars(): void {
  try {
    const raw = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .dev.vars ausente — confia no ambiente
  }
}

/**
 * Leitor de linhas bufferizado que tolera EOF — funciona tanto interativo (TTY)
 * quanto com stdin via pipe. O `readline/promises` rejeita `question()` com
 * "readline was closed" quando o pipe atinge EOF antes da pergunta consumir a
 * linha bufferizada; aqui guardamos as linhas e devolvemos "" no fim do stream.
 */
function createLineReader(rl: Interface): (prompt: string) => Promise<string> {
  const buffered: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  let closed = false;

  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else buffered.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiters.length) waiters.shift()!("");
  });

  return (prompt: string) =>
    new Promise<string>((resolve) => {
      output.write(prompt);
      const next = buffered.shift();
      if (next !== undefined) resolve(next);
      else if (closed) resolve("");
      else waiters.push(resolve);
    });
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`\n✗ Falta a variável ${name} (defina no .dev.vars ou no ambiente).`);
    process.exit(1);
  }
  return v;
}

function parseCallbackUrl(urlOrQuery: string): { code: string; apiAddress: string; store?: string } {
  // Aceita a URL completa do callback OU só a query string.
  let qs = urlOrQuery.trim();
  const qIdx = qs.indexOf("?");
  if (qIdx !== -1) qs = qs.slice(qIdx + 1);
  const params = new URLSearchParams(qs);
  const code = params.get("code") ?? "";
  const apiAddress = params.get("api_address") ?? "";
  const store = params.get("store") ?? undefined;
  if (!code || !apiAddress) {
    throw new Error(
      "Não achei `code` e/ou `api_address` na URL colada. Cole a URL completa do redirect do callback.",
    );
  }
  return { code, apiAddress, store };
}

async function main(): Promise<void> {
  loadDevVars();
  const consumerKey = required("TRAY_CONSUMER_KEY");
  const consumerSecret = required("TRAY_CONSUMER_SECRET");
  const store = (process.env.TRAY_TEST_STORE ?? "").replace(/\/+$/, "");
  if (!store) {
    console.error("\n✗ Defina TRAY_TEST_STORE (ex.: https://sualoja.commercesuite.com.br)");
    process.exit(1);
  }

  const rl = createInterface({ input, output });
  const ask = createLineReader(rl);

  // Callback pode ser qualquer URL — a Tray só anexa ?code=...&api_address=... a ela.
  // Como não temos servidor rodando, use uma URL que exista (ex.: example.com) e
  // depois copie a URL final da barra de endereços do navegador.
  const callback = "https://example.com/tray/callback";
  const authUrl =
    `${store}/auth.php?response_type=code` +
    `&consumer_key=${encodeURIComponent(consumerKey)}` +
    `&callback=${encodeURIComponent(callback)}`;

  console.log("\n=== PASSO 1 — Autorize o app ===");
  console.log("Abra esta URL no navegador (logado no admin da loja de testes):\n");
  console.log("  " + authUrl + "\n");
  console.log(
    "Após clicar em autorizar, o navegador vai pra example.com (vai dar 404 — tudo bem).",
  );
  console.log("Copie a URL COMPLETA da barra de endereços (tem ?code=...&api_address=...).\n");

  const pasted = await ask("Cole a URL final do callback aqui: ");
  const { code, apiAddress } = parseCallbackUrl(pasted);
  console.log(`\n✓ code=${code.slice(0, 8)}…  api_address=${apiAddress}`);

  console.log("\n=== PASSO 2 — Trocar code por tokens ===");
  const tokens = await exchangeCodeForTokens({
    apiAddress,
    consumerKey,
    consumerSecret,
    code,
  });
  console.log(`✓ access_token obtido (store_id=${tokens.store_id}).`);
  console.log(`  expira em: ${tokens.date_expiration_access_token}`);

  // Cliente real. getAccessToken devolve o token atual; refresh refaz via GET /auth.
  let accessToken = tokens.access_token;
  let refreshToken = tokens.refresh_token;
  const client = new TrayHttpClient({
    apiAddress,
    rateLimiter: new RateLimiter(), // default 180 req/min (limite da Tray)
    getAccessToken: async () => accessToken,
    refreshAccessToken: async () => {
      const res = await fetch(
        `${apiAddress.replace(/\/$/, "")}/auth?refresh_token=${encodeURIComponent(refreshToken)}`,
      );
      const json = (await res.json()) as { access_token: string; refresh_token: string };
      accessToken = json.access_token;
      refreshToken = json.refresh_token;
      console.log("  (token renovado via refresh_token)");
      return accessToken;
    },
  });

  console.log("\n=== PASSO 3 — Chamadas de leitura ===");

  const info = await client.request<unknown>("GET", "/info");
  console.log("• GET /info →", JSON.stringify(info).slice(0, 300));

  const cats = await client.request<{ Categories?: unknown[] }>("GET", "/categories");
  const catCount = Array.isArray(cats?.Categories) ? cats.Categories.length : "?";
  console.log(`• GET /categories → ${catCount} categorias (raiz)`);

  const prods = await client.request<{ Products?: unknown[]; paging?: unknown }>(
    "GET",
    "/products",
    { query: { limit: 3 } },
  );
  const prodCount = Array.isArray(prods?.Products) ? prods.Products.length : "?";
  console.log(`• GET /products?limit=3 → ${prodCount} produtos`);
  if (Array.isArray(cats?.Categories) && cats.Categories.length > 0) {
    console.log("\n  Categorias encontradas (para testar accordion):");
    for (const c of cats.Categories.slice(0, 10) as Array<{ Category?: { id?: unknown; name?: unknown } }>) {
      console.log(`    id=${c?.Category?.id}  name=${c?.Category?.name}`);
    }
  }

  console.log("\n=== PASSO 4 — Testar accordion SEO (opcional) ===");
  const catId = await ask(
    "ID de categoria pra adicionar um FAQ accordion (Enter pra pular): ",
  );
  if (catId.trim()) {
    const result = await seo_accordion_execute(
      {
        category_id: catId.trim(),
        intro_html: "<h2>Perguntas frequentes</h2>",
        replace: false,
        faqs: [
          { pergunta: "Qual o prazo de entrega?", resposta_html: "<p>De 3 a 7 dias úteis.</p>" },
          { pergunta: "Posso trocar?", resposta_html: "<p>Sim, em até 30 dias.</p>" },
        ],
      },
      { client },
    );
    console.log(`✓ Categoria ${result.category_id} atualizada.`);
    console.log("  HTML gravado (trecho):", result.description_html.slice(0, 200), "…");
    console.log(`\n  Confira em: ${store}/loja/listagem.php?categoria=${catId.trim()}`);
    console.log("  (ou no admin: Produtos → Categorias → editar)");
  } else {
    console.log("Pulado.");
  }

  rl.close();
  console.log("\n✓ Teste real concluído.");
}

main().catch((err) => {
  console.error("\n✗ Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
