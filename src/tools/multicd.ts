// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/multicd/SKILL.md
// Skill: tray-multicd
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const multicd_list_definition = {
  name: "tray_multicd_list",
  description: 'Listar centros de distribuição (GET /multicd/distribution-centers)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_list_execute(
  input: z.infer<typeof multicd_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const multicd_get_definition = {
  name: "tray_multicd_get",
  description: 'Consultar CD por ID (GET /multicd/distribution-centers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_get_execute(
  input: z.infer<typeof multicd_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const multicd_create_definition = {
  name: "tray_multicd_create",
  description: 'Cadastrar novo centro de distribuição (POST /multicd/distribution-centers)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_create_execute(
  input: z.infer<typeof multicd_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers`;
    const body = { "DistributionCenter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const multicd_update_definition = {
  name: "tray_multicd_update",
  description: 'Atualizar dados do CD (PUT /multicd/distribution-centers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_update_execute(
  input: z.infer<typeof multicd_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers/${encodeURIComponent(String(input.id))}`;
    const body = { "DistributionCenter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const multicd_delete_definition = {
  name: "tray_multicd_delete",
  description: 'Excluir centro de distribuição (DELETE /multicd/distribution-centers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_delete_execute(
  input: z.infer<typeof multicd_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const multicd_get_product_definition = {
  name: "tray_multicd_get_product",
  description: 'Consultar estoque detalhado de produto em todos os CDs (GET /multicd/stock/detailed/product/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_get_product_execute(
  input: z.infer<typeof multicd_get_product_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/stock/detailed/product/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const multicd_get_variant_definition = {
  name: "tray_multicd_get_variant",
  description: 'Consultar estoque detalhado de variação em todos os CDs (GET /multicd/stock/detailed/variant/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_get_variant_execute(
  input: z.infer<typeof multicd_get_variant_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/stock/detailed/variant/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const multicd_update_stock_definition = {
  name: "tray_multicd_update_stock",
  description: 'Atualizar estoque do CD (produto ou variação) (PUT /multicd/distribution-centers/:id/stock)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function multicd_update_stock_execute(
  input: z.infer<typeof multicd_update_stock_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/multicd/distribution-centers/${encodeURIComponent(String(input.id))}/stock`;
    const body = { "Stock": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const tools = [
  { definition: multicd_list_definition, execute: multicd_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_get_definition, execute: multicd_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_create_definition, execute: multicd_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_update_definition, execute: multicd_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_delete_definition, execute: multicd_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_get_product_definition, execute: multicd_get_product_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_get_variant_definition, execute: multicd_get_variant_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: multicd_update_stock_definition, execute: multicd_update_stock_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
