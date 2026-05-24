// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/notas-fiscais/SKILL.md
// Skill: tray-notas-fiscais
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const notas_fiscais_list_definition = {
  name: "tray_notas_fiscais_list",
  description: 'Listagem de notas fiscais com paginação e filtros (GET /invoices)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function notas_fiscais_list_execute(
  input: z.infer<typeof notas_fiscais_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/invoices`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const notas_fiscais_get_definition = {
  name: "tray_notas_fiscais_get",
  description: 'Consultar nota fiscal por ID (GET /invoices/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function notas_fiscais_get_execute(
  input: z.infer<typeof notas_fiscais_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/invoices/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const notas_fiscais_get_invoices_definition = {
  name: "tray_notas_fiscais_get_invoices",
  description: 'Consultar notas fiscais de um pedido (GET /orders/:order_id/invoices)',
  inputSchema: z.object({
    order_id: z.union([z.string(), z.number()]).describe('Path parameter order_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function notas_fiscais_get_invoices_execute(
  input: z.infer<typeof notas_fiscais_get_invoices_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.order_id))}/invoices`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const notas_fiscais_create_invoices_definition = {
  name: "tray_notas_fiscais_create_invoices",
  description: 'Cadastrar nota fiscal para um pedido (POST /orders/:order_id/invoices)',
  inputSchema: z.object({
    order_id: z.union([z.string(), z.number()]).describe('Path parameter order_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function notas_fiscais_create_invoices_execute(
  input: z.infer<typeof notas_fiscais_create_invoices_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/${encodeURIComponent(String(input.order_id))}/invoices`;
    const body = { "Invoice": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const notas_fiscais_update_definition = {
  name: "tray_notas_fiscais_update",
  description: 'Atualizar dados da nota fiscal (PUT /invoices/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function notas_fiscais_update_execute(
  input: z.infer<typeof notas_fiscais_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/invoices/${encodeURIComponent(String(input.id))}`;
    const body = { "Invoice": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const tools = [
  { definition: notas_fiscais_list_definition, execute: notas_fiscais_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: notas_fiscais_get_definition, execute: notas_fiscais_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: notas_fiscais_get_invoices_definition, execute: notas_fiscais_get_invoices_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: notas_fiscais_create_invoices_definition, execute: notas_fiscais_create_invoices_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: notas_fiscais_update_definition, execute: notas_fiscais_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
