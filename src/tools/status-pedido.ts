// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/status-pedido/SKILL.md
// Skill: tray-status-pedido
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const status_pedido_list_definition = {
  name: "tray_status_pedido_list",
  description: 'Listagem de status de pedido (GET /orders/statuses)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function status_pedido_list_execute(
  input: z.infer<typeof status_pedido_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/statuses`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const status_pedido_get_definition = {
  name: "tray_status_pedido_get",
  description: 'Consultar dados de um status por ID (GET /orders/statuses/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function status_pedido_get_execute(
  input: z.infer<typeof status_pedido_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/statuses/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const status_pedido_create_definition = {
  name: "tray_status_pedido_create",
  description: 'Cadastrar novo status de pedido (POST /orders/statuses)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function status_pedido_create_execute(
  input: z.infer<typeof status_pedido_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/statuses`;
    const body = { "OrderStatus": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const status_pedido_update_definition = {
  name: "tray_status_pedido_update",
  description: 'Atualizar dados do status (PUT /orders/statuses/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function status_pedido_update_execute(
  input: z.infer<typeof status_pedido_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/statuses/${encodeURIComponent(String(input.id))}`;
    const body = { "OrderStatus": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const status_pedido_delete_definition = {
  name: "tray_status_pedido_delete",
  description: 'Excluir status de pedido (DELETE /orders/statuses/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function status_pedido_delete_execute(
  input: z.infer<typeof status_pedido_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/orders/statuses/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: status_pedido_list_definition, execute: status_pedido_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: status_pedido_get_definition, execute: status_pedido_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: status_pedido_create_definition, execute: status_pedido_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: status_pedido_update_definition, execute: status_pedido_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: status_pedido_delete_definition, execute: status_pedido_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
