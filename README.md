# tray-mcp

A multi-tenant **Model Context Protocol (MCP)** server for [Tray Commerce](https://www.tray.com.br/), running on **Cloudflare Workers**.

It lets merchants connect their Tray store to any MCP-compatible AI assistant (Claude, etc.) and expose the Tray Admin API as tools — manage products, orders, customers, stock, and more, in natural language.

## Stack

- **Runtime:** Cloudflare Workers (`nodejs_compat`)
- **HTTP:** [Hono](https://hono.dev/)
- **MCP:** [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) (Streamable HTTP transport)
- **DB:** Postgres on Supabase via [Drizzle ORM](https://orm.drizzle.team/) + [`postgres`](https://github.com/porsager/postgres)
- **Validation:** [Zod](https://zod.dev/)
- **HTML sanitization:** `sanitize-html`
- **Tests:** Vitest + MSW

## Project layout

```
src/
  index.ts            Hono app, route registration
  db/
    schema.ts         Drizzle pgTable definitions
    migrations/       SQL migrations
scripts/
  gen-tools.ts        Generate MCP tool stubs from Tray OpenAPI (TBD)
  smoke.ts            End-to-end smoke test (TBD)
wrangler.toml         Cloudflare Workers config
drizzle.config.ts     Drizzle Kit config
```

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example secrets file and fill in real values:

   ```bash
   cp .dev.vars.example .dev.vars
   # edit .dev.vars
   ```

   You need:
   - `DATABASE_URL` — a Postgres connection string (Supabase pooler URL recommended)
   - `TRAY_CONSUMER_KEY` / `TRAY_CONSUMER_SECRET` — from your Tray partner app
   - `MCP_HOST` — the public URL where the Worker is reachable

3. Apply the database schema (one-time):

   ```bash
   psql "$DATABASE_URL" -f src/db/migrations/0001_init.sql
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The Worker is available at `http://localhost:8787`. Hit `GET /` to verify:

   ```bash
   curl http://localhost:8787/
   # {"status":"ok","name":"tray-mcp"}
   ```

## Deploying

1. Authenticate with Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Upload your secrets (do **not** commit them to `wrangler.toml`):

   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put TRAY_CONSUMER_KEY
   npx wrangler secret put TRAY_CONSUMER_SECRET
   ```

   `MCP_HOST` can stay in `wrangler.toml` since it's not sensitive.

3. Deploy:

   ```bash
   npm run deploy
   ```

Wrangler prints the public URL (e.g. `https://tray-mcp.<account>.workers.dev`). Use that as `MCP_HOST`.

## Registering the app on Tray

1. Log in to the [Tray Partner Panel](https://www.tray.com.br/parceiros/).
2. **Apps → Create new app**.
3. Fill in:
   - **App name**: `Tray MCP` (or your branding)
   - **Callback URL**: `https://<your-mcp-host>/oauth/callback`
   - **Install URL**: `https://<your-mcp-host>/oauth/install`
   - **Permissions / scopes**: select the resources you want the MCP to manage (products, orders, customers, stock, etc.)
4. Save. Tray gives you a **Consumer Key** and **Consumer Secret** — put these into `TRAY_CONSUMER_KEY` / `TRAY_CONSUMER_SECRET`.
5. Submit the app for review (or use it as a private app while you're developing).

## Installing on a store

1. As the merchant, open the app listing in the Tray store admin and click **Install**.
2. Tray redirects to `GET /oauth/install` on this Worker, which redirects to Tray's authorize page.
3. The merchant confirms the permissions; Tray redirects back to `GET /oauth/callback?code=...`.
4. The Worker exchanges the code for `access_token` + `refresh_token`, persists them, and renders `/install-success` with a **bearer token** for MCP access. **Copy it** — it's only shown once.

## Connecting from claude.ai

1. In Claude → **Settings → Connectors → Add custom connector**.
2. Choose **MCP server** and fill in:
   - **URL**: `https://<your-mcp-host>/mcp`
   - **Auth**: `Bearer <token-from-install-success>`
3. Save. Claude will discover the Tray tools and you can start asking things like _"list my last 10 orders"_ or _"set stock of SKU ABC to 50"_.

## Scripts

| Script              | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | `wrangler dev` — local Worker             |
| `npm run build`     | `wrangler deploy --dry-run`               |
| `npm run deploy`    | Deploy to Cloudflare Workers              |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm run lint`      | ESLint                                    |
| `npm test`          | Vitest                                    |
| `npm run gen-tools` | Generate MCP tool stubs from Tray OpenAPI |
| `npm run smoke`     | End-to-end smoke test against a live MCP  |

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE.md) — free for personal, hobby, research, educational, charitable, and government use. **Commercial use is not permitted.** See the full text in `LICENSE.md`.
