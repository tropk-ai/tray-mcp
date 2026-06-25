# HANDOFF — Tray MCP

Documento de continuidade para uma nova sessão de Claude Code rodando neste repositório localmente.

---

## Quem é você (próxima sessão de Claude)

Você está continuando o projeto **tray-mcp**: um servidor **MCP (Model Context Protocol)** HTTP multi-tenant que conecta o **Claude** (claude.ai Web, Claude Desktop, Claude Code) a qualquer **loja Tray Commerce** instalada via marketplace de apps da Tray.

A primeira sessão (que rodou no Claude Code na web) construiu o projeto inteiro mas **não conseguiu validar contra a loja Tray real** porque o ambiente web bloqueia rede externa (allowlist). Agora você está rodando na máquina local do dono, **com acesso à internet**, então pode finalmente testar de verdade.

O dono se chama **Luiz** (luiz.gardelin@gmail.com). Ele é o desenvolvedor — fala português.

---

## O que o projeto faz (resumo executivo)

A Tray é uma plataforma brasileira de e-commerce (tipo Shopify BR). Ela tem uma **Loja de Aplicativos** (`aplicativos.tray.com.br`) onde lojistas instalam apps de terceiros, exatamente como o Shopify App Store.

Este projeto é um desses apps: quando instalado em uma loja Tray, ele expõe a API Admin da Tray como **tools MCP** que qualquer Claude pode consumir. O lojista pergunta no Claude _"adiciona um FAQ accordion na categoria Camisetas"_ e o Claude usa o tool `tray_categorias_set_seo_accordion` que faz `PUT /web_api/categories/:id` na Tray.

**Distribuição: 100% gratuito (PolyForm Noncommercial 1.0.0). Sem billing.**

### Fluxo do usuário final (1-click)
1. Lojista vai na vitrine `aplicativos.tray.com.br`, clica **Instalar** no nosso app
2. Tray pede autorização OAuth → o navegador volta pro nosso `/install-success`
3. A página mostra um botão grande **"Conectar ao Claude"** → abre `https://claude.ai/install-mcp?url=...&name=Tray%20-%20...`
4. Claude.ai abre o diálogo "Add connector" já preenchido → lojista clica **Add**
5. Claude faz OAuth automático contra o nosso servidor; um cookie HMAC `preauth_store` que gravamos no passo 2 pula a tela de "qual loja?"
6. Pronto — Claude conectado, **zero digitação, zero paste**

---

## Arquitetura

```
┌─ Tray (hospedado pela Tray) ────────────────┐
│  Loja do lojista + vitrine de apps          │
│  OAuth (auth.php) — só a tela "Autorizar"   │
└─────────────────────────────────────────────┘
                  ↓
┌─ Nosso servidor (Cloudflare Workers) ───────┐
│  Hono app, multi-tenant, 1 deploy só        │
│  - OAuth Tray (install/callback/refresh)    │
│  - OAuth Provider MCP (DCR+PKCE, spec 2025) │
│  - MCP server HTTP (151 tools)              │
│  - Webhook receiver (<500ms)                │
│  - Cookie preauth pro 1-click               │
└─────────────────────────────────────────────┘
                  ↓
┌─ Postgres (Supabase) ───────────────────────┐
│  stores | oauth_tokens | mcp_sessions       │
│  oauth_clients | oauth_pending              │
│  webhook_events                             │
└─────────────────────────────────────────────┘
                  ↓
┌─ API Tray ({api_address}/web_api/*) ────────┐
│  Cada loja tem seu api_address próprio      │
└─────────────────────────────────────────────┘
```

### Stack
- **Runtime:** Cloudflare Workers (`nodejs_compat`)
- **HTTP:** Hono
- **MCP SDK:** `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- **DB:** Postgres (Supabase) via Drizzle ORM + driver `postgres`
- **Validação:** Zod
- **Sanitização HTML:** `sanitize-html`
- **Testes:** Vitest + MSW

### Layout do código
```
src/
  index.ts                  Hono entry + todas as rotas
  db/
    schema.ts               Drizzle pgTable (6 tabelas)
    migrations/0001_init.sql
  lib/
    db.ts                   createDb(url) factory
    html-sanitizer.ts       sanitize() + escapeHtml()
  tray/
    client.ts               TrayHttpClient (retry/backoff/auto-refresh)
    rate-limiter.ts         180 req/min token bucket
  oauth/                    OAuth Tray (upstream — quando lojista instala app)
    install.ts callback.ts refresh.ts success.ts
  oauth-provider/           OAuth Provider MCP (downstream — quando Claude conecta)
    metadata.ts             /.well-known/oauth-{protected-resource,authorization-server}
    register.ts             POST /register (RFC 7591 DCR)
    authorize.ts            GET /authorize (com fast-path do cookie preauth)
    store-selected.ts       POST /authorize/store-selected (fallback se sem cookie)
    tray-callback.ts        GET /oauth/tray-callback (recebe code da Tray, emite mcp_code)
    token.ts                POST /token (PKCE + emite mcp bearer)
    util.ts                 PKCE S256, HMAC preauth, helpers
  mcp/
    server.ts               createMcpServer({client, storeId}) — registra tools/list e tools/call
    auth.ts                 authMcp middleware — resolve Bearer → store_id → TrayClient
    transport.ts            mcpPost/mcpGet (StreamableHTTP)
  tools/
    index.ts                allTools (151 tools)
    seo-accordion.ts        Tool especial — caso de uso do Luiz
    <area>.ts × 35          Tools auto-geradas pelo codegen
  webhooks/
    receiver.ts             POST /webhook/:id — responde <500ms
    processor.ts            Batch processor (FOR UPDATE SKIP LOCKED)
scripts/
  gen-tools.ts              Regenera src/tools/ a partir do plugin oficial
  test-real-store.ts        Teste manual contra loja Tray real (você roda)
  lib/parse-skill.ts        Parser markdown dos SKILL.md
tests/                      54 testes Vitest (todos verdes)
landing/index.html          Página pública do produto
LICENSE.md                  PolyForm Noncommercial 1.0.0
```

### Tabelas do DB
| Tabela | Para que serve |
|---|---|
| `stores` | Uma linha por loja Tray instalada (`tray_store_id`, `api_address`, `owner_email`) |
| `oauth_tokens` | `access_token` (3h) + `refresh_token` (30d) da Tray, indexado por `store_id` |
| `mcp_sessions` | Bearer tokens MCP emitidos pra Claude (hash sha256), linkados a uma `store_id` |
| `oauth_clients` | Clientes DCR registrados pelo Claude (RFC 7591) |
| `oauth_pending` | OAuth requests intermediários (entre `/authorize` e `/token`) |
| `webhook_events` | Eventos recebidos da Tray pra processamento async |

---

## Estado atual

- **151 tools** cobrindo todas as 35 áreas da API Tray (produtos, pedidos, categorias, páginas, clientes, pagamentos, fretes, etc.)
- **OAuth Tray** completo, com refresh automático
- **OAuth Provider MCP** completo (spec 2025-03-26 + DCR + PKCE)
- **1-click Tray → Claude** via cookie HMAC + deeplink
- **54/54 testes passando**, `tsc --noEmit` zero erros
- **12 commits** na branch `claude/tray-api-catalog-study-bJk37` (`origin/claude/tray-api-catalog-study-bJk37`)
- **NÃO testado contra loja real** — esta é a próxima missão

### O que está pendente
1. **Validar `npm run test:real` contra a loja de testes Tray** (passo crítico — primeira vez tocando na API real)
2. Conforme aparecer bug ou diferença entre o que documentei e o que a Tray devolve de verdade, corrigir
3. (Opcional) Subir o servidor completo localmente com túnel HTTPS (cloudflared/ngrok) e fazer o OAuth Tray ponta a ponta no admin
4. (Opcional) Deploy real no Cloudflare Workers + Supabase
5. (Opcional) Abrir PR pra `main` (https://github.com/tropk-ai/tray-mcp/compare/main...claude/tray-api-catalog-study-bJk37)

---

## Credenciais e endereços (loja de testes Tray)

Já entregues pelo time da Tray. Estão (ou devem estar) num `.dev.vars` local que **não vai pro git** (`.gitignore` cobre).

```
# Loja teste
TRAY_TEST_STORE=https://lojatesteintegracaotray.commercesuite.com.br

# Chaves do app "MCP Tray para Claude - Emporio Sem Alcool"
TRAY_CONSUMER_KEY=<consumer_key — ver .dev.vars local, NÃO commitar>
TRAY_CONSUMER_SECRET=<consumer_secret — ver .dev.vars local, NÃO commitar>

# Pra rodar o servidor completo:
MCP_HOST=http://localhost:8787   # ou a URL HTTPS do túnel
DATABASE_URL=                    # Postgres do Supabase
PREAUTH_SECRET=                  # opcional, default = TRAY_CONSUMER_SECRET
```

**Rate limit Tray:** 180 req/min, 10.000 req/dia (50.000 corp). Já implementado em `src/tray/rate-limiter.ts`. Não desrespeitar — Tray suspende as chaves.

---

## Próximas ações (execute nesta ordem)

### 1. Sanidade
```bash
git status                         # confirmar que está em claude/tray-api-catalog-study-bJk37
git pull origin claude/tray-api-catalog-study-bJk37
npm install
npx tsc --noEmit                   # zero erros esperado
npx vitest run                     # 54/54 esperado
```

### 2. Garantir `.dev.vars`
Se o arquivo `.dev.vars` não existir na raiz, criar com as credenciais acima (estão neste documento). Confirmar que `git status` NÃO mostra `.dev.vars` como untracked (o `.gitignore` deve estar cobrindo).

### 3. **Rodar o teste real contra a loja Tray**
```bash
npm run test:real
```
O que esse script faz:
1. Imprime uma URL de `auth.php` — Luiz abre no navegador (precisa estar logado no admin da loja teste)
2. Após Luiz clicar "Autorizar", o navegador vai pra `https://example.com/tray/callback?code=...&api_address=...` (404, normal — só precisamos da URL)
3. Luiz cola a URL final no terminal
4. Script troca `code` por tokens usando a função real `exchangeCodeForTokens` do `src/oauth/callback.ts`
5. Constrói `TrayHttpClient` real e chama `/info`, `/categories`, `/products?limit=3`
6. Lista IDs de categoria pra Luiz escolher
7. (Opcional) Roda `seo_accordion_execute` numa categoria, adicionando FAQ accordion via `PUT /categories/:id`

**Resultado esperado:** lista de categorias e produtos da loja teste impressa no terminal, e (se Luiz escolher uma categoria) accordion HTML gravado na descrição dela, visível tanto no admin Tray (Produtos → Categorias → editar) quanto no frontend (`{store}/loja/listagem.php?categoria={id}`).

**Se falhar:** o erro mais provável é diferença entre o que documentei (vindo do plugin oficial `tray-tecnologia/tray-api-ai-plugin`) e o que a API Tray devolve de verdade. Corrigir nos arquivos pertinentes — provavelmente `src/oauth/callback.ts` (formato do POST `/auth`) ou `src/tray/client.ts` (parsing de erro). Adicionar regression test em `tests/`.

### 4. (Opcional) Servidor completo end-to-end
Quando o passo 3 estiver verde:
- Provisionar Postgres em supabase.com (free tier) → copiar a Pooler URL pra `DATABASE_URL` no `.dev.vars`
- Rodar migration: `psql "$DATABASE_URL" -f src/db/migrations/0001_init.sql`
- Túnel HTTPS: `cloudflared tunnel --url http://localhost:8787` (anota a URL)
- Atualizar `MCP_HOST` no `.dev.vars` pra essa URL
- No painel de parceiros Tray, atualizar URL de callback pra `${MCP_HOST}/oauth/callback`
- `npm run dev` → instalar app na loja teste novamente → testar o fluxo 1-click no claude.ai

### 5. (Opcional) Deploy de produção
- `npx wrangler login`
- Secrets: `npx wrangler secret put DATABASE_URL` (+ outras vars)
- `npm run deploy`
- Atualizar URL de callback no app Tray pra `https://<deploy>.workers.dev/oauth/callback`

---

## Coisas que você NÃO deve mexer sem motivo forte

- **`src/tools/<area>.ts`** (35 arquivos): são **auto-gerados** pelo `scripts/gen-tools.ts` a partir do submódulo conceitual `tray-tecnologia/tray-api-ai-plugin`. Se precisar mudar uma tool, mude o gerador, não o arquivo. A exceção é `src/tools/seo-accordion.ts` (escrito à mão).
- **`tests/`**: 54 testes já existem e todos passam. Se você fizer mudança, garanta que todos continuam passando.
- **Comentários no código**: foram escritos com critério (só quando o "por quê" não é óbvio). Não inflar.

## Coisas a saber sobre a API Tray

- Todos os endpoints estão sob `${api_address}/web_api/*`. O `api_address` vem do callback OAuth, é específico por loja, e fica em `stores.api_address`.
- `access_token` vai como **query param** (`?access_token=...`), nunca header.
- Payloads de POST/PUT são **envoltos na chave do recurso**: `{"Category": {...}}`, `{"Product": {...}}`. O codegen já cuida disso.
- Datas: `YYYY-MM-DD HH:MM:SS`.
- Tokens: `access_token` válido 3h, `refresh_token` válido 30d. Renovação via `GET ${api_address}/auth?refresh_token=X`.
- Códigos de erro de auth: 1000 (expirado loja ativa — renovar), 1001/1002/1003 (loja bloqueada/inativa/cancelada), 1099 (token inválido). Já tratados em `src/tray/client.ts`.
- A página de categoria suporta HTML no campo `description` (TinyMCE no admin). `<details>/<summary>` passam. `<script>` e `on*` são bloqueados pelo backend deles — nosso sanitizer também remove isso por garantia.

## Convenções do projeto

- **Português** nas mensagens pro Luiz, **inglês** nos identificadores de código (nomes de função, variáveis, comentários técnicos).
- Commits seguem o padrão `tipo: descrição` (feat, fix, chore, test, docs).
- Cada commit deve ter o trailer `https://claude.ai/code/session_01JC49fkg6jG9jX3Gph3n9M2`.
- Não cria PR sem o Luiz pedir explicitamente.
- Não roda comandos destrutivos (`git reset --hard`, `force push` etc.) sem pedir.

---

## Conhecimento útil

- Plugin oficial da Tray pra AI (skills/agents, NÃO MCP): https://github.com/tray-tecnologia/tray-api-ai-plugin
- Doc oficial API: https://developers.tray.com.br/
- Swagger oficial: https://api.commerce.tray.com.br/app/webroot/api-docs/
- Central do Parceiro: https://partners.tray.com.br/
- Vitrine de apps: https://aplicativos.tray.com.br/
- Spec MCP authorization: https://modelcontextprotocol.info/specification/draft/basic/authorization/
- Cloudflare workers-oauth-provider (referência de design): https://github.com/cloudflare/workers-oauth-provider

---

## Quando terminar uma tarefa

1. `npx tsc --noEmit && npx vitest run` — tudo verde
2. `git add` + `git commit` com mensagem clara + trailer da session
3. `git push origin claude/tray-api-catalog-study-bJk37`
4. Reportar pro Luiz o que mudou e o próximo passo recomendado
