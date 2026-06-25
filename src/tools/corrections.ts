// Hand-written route corrections for tools whose paths/bodies were generated
// wrong from the upstream tray-api-ai-plugin SKILL.md specs.
//
// This file is NOT auto-generated and survives `pnpm gen-tools`. The MCP
// server applies it over the generated `allTools` list (see mcp/server.ts):
//   - names in `removedToolNames` are dropped (routes that don't exist live)
//   - entries in `correctedTools` replace the generated tool of the same name
//
// Every path/body here was validated live against the Tray test store 1501119
// (junho/2026). See homologacao/ for the captured evidence.

import { z } from "zod";

import type { TrayClient } from "../tray/client.js";

export type ToolEntry = {
  definition: {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny;
  };
  execute: (input: any, ctx: { client: TrayClient }) => Promise<unknown>;
};

/** Tools pointing at routes that do not exist on the live API (return 404). */
export const removedToolNames: ReadonlySet<string> = new Set<string>([
  // Cancelamento não tem rota própria; cancela-se via PUT /orders/:id (status_id).
  "tray_pedidos_cancel",
  // Notas fiscais não têm coleção global; só existem aninhadas em /orders/:id/invoices.
  "tray_notas_fiscais_list",
  "tray_notas_fiscais_get",
  // Remoção de imagem via /images/remove não existe (404).
  "tray_imagens_produtos_create",
  // Kit não tem update por id (ProductKit é excluído/recriado).
  "tray_kits_update",
  // DELETE /kits/:id e /products/kits/:id retornam 404; não há exclusão de
  // vínculo de kit por id (remove-se o produto-pai). Rota inexistente.
  "tray_produtos_delete_kits",
]);

const optionalQuery = z
  .record(z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe("Optional query string parameters (filters, pagination, sort)");

const accessToken = z
  .string()
  .optional()
  .describe(
    "Override the request access_token. Defaults to the configured Tray client token.",
  );

const id = z.union([z.string(), z.number()]);
const body = z
  .record(z.unknown())
  .describe(
    "Resource fields. Will be wrapped automatically with the appropriate top-level key.",
  );

export const correctedTools: ToolEntry[] = [
  // ---- Pedidos ----------------------------------------------------------
  {
    definition: {
      name: "tray_pedidos_get_full",
      description: "Dados completos do pedido (GET /orders/:id/complete)",
      inputSchema: z.object({ id, query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/orders/${encodeURIComponent(String(input.id))}/complete`, {
        query: input.query,
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_pedidos_create_products",
      description:
        "Incluir produto no pedido (POST /orders/includeProduct/:id). body = objeto ProductsSold, ex.: {\"product_id\":\"4\",\"variant_id\":\"3705\",\"quantity\":\"1\",\"price\":\"9.90\",\"original_price\":\"9.90\"}",
      inputSchema: z.object({ id, body, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("POST", `/orders/includeProduct/${encodeURIComponent(String(input.id))}`, {
        body: { ProductsSold: input.body },
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_pedidos_delete",
      description:
        "Remover produto do pedido (PUT /orders/excludeProduct/:id/:product_id)",
      inputSchema: z.object({
        id,
        product_id: id,
        access_token: accessToken,
      }),
    },
    execute: (input, ctx) =>
      ctx.client.request(
        "PUT",
        `/orders/excludeProduct/${encodeURIComponent(String(input.id))}/${encodeURIComponent(String(input.product_id))}`,
        { body: {}, accessToken: input.access_token },
      ),
  },

  // ---- Pagamentos -------------------------------------------------------
  {
    definition: {
      name: "tray_pagamentos_list_settings",
      description:
        "Configurações de um método de pagamento (GET /payments/methods/settings/:id)",
      inputSchema: z.object({ id, query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request(
        "GET",
        `/payments/methods/settings/${encodeURIComponent(String(input.id))}`,
        { query: input.query, accessToken: input.access_token },
      ),
  },

  // ---- Endereços de cliente (coleção plana /customers/addresses) --------
  {
    definition: {
      name: "tray_enderecos_cliente_get_addresses",
      description:
        "Listar endereços de clientes (GET /customers/addresses). Filtre por customer_id na query.",
      inputSchema: z.object({ query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/customers/addresses`, {
        query: input.query,
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_enderecos_cliente_get",
      description: "Consultar um endereço por ID (GET /customers/addresses/:id)",
      inputSchema: z.object({ id, query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/customers/addresses/${encodeURIComponent(String(input.id))}`, {
        query: input.query,
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_enderecos_cliente_create_addresses",
      description:
        "Cadastrar endereço (POST /customers/addresses). body inclui customer_id e country=\"BRA\".",
      inputSchema: z.object({ body, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("POST", `/customers/addresses`, {
        body: { CustomerAddress: input.body },
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_enderecos_cliente_delete",
      description: "Excluir um endereço (DELETE /customers/addresses/:id)",
      inputSchema: z.object({ id, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("DELETE", `/customers/addresses/${encodeURIComponent(String(input.id))}`, {
        accessToken: input.access_token,
      }),
  },

  // ---- Nota fiscal (recurso OrderInvoice, aninhado em /orders) ----------
  {
    definition: {
      name: "tray_notas_fiscais_create_invoices",
      description:
        "Cadastrar NF do pedido (POST /orders/:order_id/invoices). body = OrderInvoice {number,serie,key(44),issue_date,value}.",
      inputSchema: z.object({
        order_id: id,
        body,
        access_token: accessToken,
      }),
    },
    execute: (input, ctx) =>
      ctx.client.request(
        "POST",
        `/orders/${encodeURIComponent(String(input.order_id))}/invoices`,
        { body: { OrderInvoice: input.body }, accessToken: input.access_token },
      ),
  },
  {
    definition: {
      name: "tray_notas_fiscais_update",
      description:
        "Atualizar NF do pedido (PUT /orders/:order_id/invoices/:invoice_id). body = OrderInvoice.",
      inputSchema: z.object({
        order_id: id,
        invoice_id: id,
        body,
        access_token: accessToken,
      }),
    },
    execute: (input, ctx) =>
      ctx.client.request(
        "PUT",
        `/orders/${encodeURIComponent(String(input.order_id))}/invoices/${encodeURIComponent(String(input.invoice_id))}`,
        { body: { OrderInvoice: input.body }, accessToken: input.access_token },
      ),
  },

  // ---- Imagem de variação (usa /products/:product_id/images) ------------
  {
    definition: {
      name: "tray_imagens_produtos_create_images_images",
      description:
        "Enviar imagem de variação (POST /products/:product_id/images). body inclui http e variant_id.",
      inputSchema: z.object({
        product_id: id,
        body,
        access_token: accessToken,
      }),
    },
    execute: (input, ctx) =>
      ctx.client.request(
        "POST",
        `/products/${encodeURIComponent(String(input.product_id))}/images`,
        { body: { ProductImage: input.body }, accessToken: input.access_token },
      ),
  },

  // ---- Kits (ProductKit; get é via filtro product_parent_id) ------------
  {
    definition: {
      name: "tray_kits_get",
      description:
        "Consultar a composição de um kit (GET /products/kits?product_parent_id=:id)",
      inputSchema: z.object({ id, query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/products/kits`, {
        query: { ...(input.query ?? {}), product_parent_id: String(input.id) },
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_kits_create",
      description:
        "Vincular produto a um kit (POST /products/kits). O produto-pai precisa ter sido criado com is_kit=\"1\". body = ProductKit {product_parent_id,product_id,quantity,discount_type,discount}.",
      inputSchema: z.object({ body, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("POST", `/products/kits`, {
        body: { ProductKit: input.body },
        accessToken: input.access_token,
      }),
  },

  // ---- Variações (prefixo canônico /products/variants) ------------------
  {
    definition: {
      name: "tray_variacoes_list",
      description: "Listagem de variações (GET /products/variants)",
      inputSchema: z.object({ query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/products/variants`, {
        query: input.query,
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_variacoes_get",
      description: "Consultar uma variação por ID (GET /products/variants/:id)",
      inputSchema: z.object({ id, query: optionalQuery, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("GET", `/products/variants/${encodeURIComponent(String(input.id))}`, {
        query: input.query,
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_variacoes_create",
      description: "Cadastrar variação (POST /products/variants)",
      inputSchema: z.object({ body, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("POST", `/products/variants`, {
        body: { Variant: input.body },
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_variacoes_update",
      description: "Atualizar variação (PUT /products/variants/:id)",
      inputSchema: z.object({ id, body, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("PUT", `/products/variants/${encodeURIComponent(String(input.id))}`, {
        body: { Variant: input.body },
        accessToken: input.access_token,
      }),
  },
  {
    definition: {
      name: "tray_variacoes_delete",
      description: "Excluir variação (DELETE /products/variants/:id)",
      inputSchema: z.object({ id, access_token: accessToken }),
    },
    execute: (input, ctx) =>
      ctx.client.request("DELETE", `/products/variants/${encodeURIComponent(String(input.id))}`, {
        accessToken: input.access_token,
      }),
  },
];

/**
 * Apply the corrections over the generated tool list: drop removed tools and
 * replace generated entries with the corrected ones (matched by name).
 */
export function applyCorrections(
  base: readonly { definition: { name: string } }[],
): any[] {
  const correctionByName = new Map(correctedTools.map((t) => [t.definition.name, t]));
  const result: any[] = [];
  for (const tool of base) {
    const name = tool.definition.name;
    if (removedToolNames.has(name)) continue;
    result.push(correctionByName.get(name) ?? tool);
    correctionByName.delete(name);
  }
  // Any corrected tool that didn't match a generated one is appended.
  for (const leftover of correctionByName.values()) result.push(leftover);
  return result;
}
