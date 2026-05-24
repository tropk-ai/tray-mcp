// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/pagamentos/SKILL.md
// Skill: tray-pagamentos
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const pagamentos_list_definition = {
  name: "tray_pagamentos_list",
  description: 'Listagem de pagamentos com paginação e filtros (GET /payments)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_list_execute(
  input: z.infer<typeof pagamentos_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pagamentos_get_definition = {
  name: "tray_pagamentos_get",
  description: 'Consultar dados de um pagamento por ID (GET /payments/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_get_execute(
  input: z.infer<typeof pagamentos_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pagamentos_create_definition = {
  name: "tray_pagamentos_create",
  description: 'Cadastrar novo pagamento (POST /payments)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_create_execute(
  input: z.infer<typeof pagamentos_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments`;
    const body = { "Payment": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const pagamentos_update_definition = {
  name: "tray_pagamentos_update",
  description: 'Atualizar dados do pagamento (PUT /payments/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_update_execute(
  input: z.infer<typeof pagamentos_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments/${encodeURIComponent(String(input.id))}`;
    const body = { "Payment": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const pagamentos_delete_definition = {
  name: "tray_pagamentos_delete",
  description: 'Excluir pagamento (DELETE /payments/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_delete_execute(
  input: z.infer<typeof pagamentos_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const pagamentos_list_options_definition = {
  name: "tray_pagamentos_list_options",
  description: 'Listar opções/métodos de pagamento disponíveis na loja (GET /payments/options)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_list_options_execute(
  input: z.infer<typeof pagamentos_list_options_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments/options`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const pagamentos_list_settings_definition = {
  name: "tray_pagamentos_list_settings",
  description: 'Consultar configurações de pagamento da loja (GET /payments/settings)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function pagamentos_list_settings_execute(
  input: z.infer<typeof pagamentos_list_settings_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/payments/settings`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: pagamentos_list_definition, execute: pagamentos_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_get_definition, execute: pagamentos_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_create_definition, execute: pagamentos_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_update_definition, execute: pagamentos_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_delete_definition, execute: pagamentos_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_list_options_definition, execute: pagamentos_list_options_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: pagamentos_list_settings_definition, execute: pagamentos_list_settings_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
