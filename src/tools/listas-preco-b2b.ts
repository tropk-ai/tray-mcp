// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/listas-preco-b2b/SKILL.md
// Skill: tray-listas-preco-b2b
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const listas_preco_b2b_list_definition = {
  name: "tray_listas_preco_b2b_list",
  description: 'Listar todas as listas de preço (GET /price-lists)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_list_execute(
  input: z.infer<typeof listas_preco_b2b_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const listas_preco_b2b_get_definition = {
  name: "tray_listas_preco_b2b_get",
  description: 'Retorna uma lista de preço (GET /price-lists/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_get_execute(
  input: z.infer<typeof listas_preco_b2b_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const listas_preco_b2b_create_definition = {
  name: "tray_listas_preco_b2b_create",
  description: 'Criar lista de preço (POST /price-lists)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_create_execute(
  input: z.infer<typeof listas_preco_b2b_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists`;
    const body = { "PriceList": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const listas_preco_b2b_update_definition = {
  name: "tray_listas_preco_b2b_update",
  description: 'Atualizar lista de preço (PUT /price-lists/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_update_execute(
  input: z.infer<typeof listas_preco_b2b_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}`;
    const body = { "PriceList": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const listas_preco_b2b_delete_definition = {
  name: "tray_listas_preco_b2b_delete",
  description: 'Excluir lista de preço (DELETE /price-lists/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_delete_execute(
  input: z.infer<typeof listas_preco_b2b_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const listas_preco_b2b_get_values_definition = {
  name: "tray_listas_preco_b2b_get_values",
  description: 'Listar valores de uma lista (GET /price-lists/:id/values)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_get_values_execute(
  input: z.infer<typeof listas_preco_b2b_get_values_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}/values`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const listas_preco_b2b_get_price_lists_values_definition = {
  name: "tray_listas_preco_b2b_get_price_lists_values",
  description: 'Retorna um valor (GET /price-lists/:id/values/:value_id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    value_id: z.union([z.string(), z.number()]).describe('Path parameter value_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_get_price_lists_values_execute(
  input: z.infer<typeof listas_preco_b2b_get_price_lists_values_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}/values/${encodeURIComponent(String(input.value_id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const listas_preco_b2b_create_values_definition = {
  name: "tray_listas_preco_b2b_create_values",
  description: 'Criar valor na lista (POST /price-lists/:id/values)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_create_values_execute(
  input: z.infer<typeof listas_preco_b2b_create_values_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}/values`;
    const body = { "PriceList": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const listas_preco_b2b_update_values_definition = {
  name: "tray_listas_preco_b2b_update_values",
  description: 'Atualizar valor (PUT /price-lists/:id/values/:value_id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    value_id: z.union([z.string(), z.number()]).describe('Path parameter value_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_update_values_execute(
  input: z.infer<typeof listas_preco_b2b_update_values_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}/values/${encodeURIComponent(String(input.value_id))}`;
    const body = { "PriceList": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const listas_preco_b2b_delete_values_definition = {
  name: "tray_listas_preco_b2b_delete_values",
  description: 'Excluir valor (DELETE /price-lists/:id/values/:value_id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    value_id: z.union([z.string(), z.number()]).describe('Path parameter value_id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listas_preco_b2b_delete_values_execute(
  input: z.infer<typeof listas_preco_b2b_delete_values_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/price-lists/${encodeURIComponent(String(input.id))}/values/${encodeURIComponent(String(input.value_id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: listas_preco_b2b_list_definition, execute: listas_preco_b2b_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_get_definition, execute: listas_preco_b2b_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_create_definition, execute: listas_preco_b2b_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_update_definition, execute: listas_preco_b2b_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_delete_definition, execute: listas_preco_b2b_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_get_values_definition, execute: listas_preco_b2b_get_values_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_get_price_lists_values_definition, execute: listas_preco_b2b_get_price_lists_values_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_create_values_definition, execute: listas_preco_b2b_create_values_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_update_values_definition, execute: listas_preco_b2b_update_values_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: listas_preco_b2b_delete_values_definition, execute: listas_preco_b2b_delete_values_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
