// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/pedidos/SKILL.md
// Skill: tray-pedidos
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const pedidos_list_definition = {
  name: "tray_pedidos_list",
  description: 'Listagem de pedidos com paginação e filtros (GET /orders)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_list_execute(
  input: z.infer<typeof pedidos_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pedidos_get_definition = {
  name: "tray_pedidos_get",
  description: 'Dados do pedido por ID (GET /orders/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_get_execute(
  input: z.infer<typeof pedidos_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pedidos_get_full_definition = {
  name: "tray_pedidos_get_full",
  description: 'Dados completos (produtos, cliente, pagamento, frete) (GET /orders/:id/full)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_get_full_execute(
  input: z.infer<typeof pedidos_get_full_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}/full`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pedidos_create_definition = {
  name: "tray_pedidos_create",
  description: 'Cadastrar novo pedido (POST /orders)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_create_execute(
  input: z.infer<typeof pedidos_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders`;
    const body = { "Order": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const pedidos_update_definition = {
  name: "tray_pedidos_update",
  description: 'Atualizar dados do pedido (PUT /orders/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_update_execute(
  input: z.infer<typeof pedidos_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}`;
    const body = { "Order": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const pedidos_cancel_definition = {
  name: "tray_pedidos_cancel",
  description: 'Cancelar pedido (PUT /orders/:id/cancel)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_cancel_execute(
  input: z.infer<typeof pedidos_cancel_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}/cancel`;
    const body = { "Cancel": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const pedidos_create_products_definition = {
  name: "tray_pedidos_create_products",
  description: 'Incluir produtos no pedido (POST /orders/:id/products)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_create_products_execute(
  input: z.infer<typeof pedidos_create_products_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}/products`;
    const body = { "Order": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const pedidos_delete_definition = {
  name: "tray_pedidos_delete",
  description: 'Excluir produto do pedido (DELETE /orders/:id/products/:product_id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    product_id: z.union([z.string(), z.number()]).describe('Path parameter product_id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pedidos_delete_execute(
  input: z.infer<typeof pedidos_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.id))}/products/${encodeURIComponent(String(input.product_id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: pedidos_list_definition, execute: pedidos_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_get_definition, execute: pedidos_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_get_full_definition, execute: pedidos_get_full_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_create_definition, execute: pedidos_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_update_definition, execute: pedidos_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_cancel_definition, execute: pedidos_cancel_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_create_products_definition, execute: pedidos_create_products_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pedidos_delete_definition, execute: pedidos_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
