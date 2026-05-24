// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/clientes/SKILL.md
// Skill: tray-clientes
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const clientes_list_definition = {
  name: "tray_clientes_list",
  description: 'Listagem de clientes com paginação e filtros (GET /customers)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function clientes_list_execute(
  input: z.infer<typeof clientes_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const clientes_get_definition = {
  name: "tray_clientes_get",
  description: 'Consultar dados do cliente por ID (GET /customers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function clientes_get_execute(
  input: z.infer<typeof clientes_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const clientes_create_definition = {
  name: "tray_clientes_create",
  description: 'Cadastrar novo cliente (POST /customers)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function clientes_create_execute(
  input: z.infer<typeof clientes_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers`;
    const body = { "Customer": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const clientes_update_definition = {
  name: "tray_clientes_update",
  description: 'Atualizar dados do cliente (PUT /customers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function clientes_update_execute(
  input: z.infer<typeof clientes_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.id))}`;
    const body = { "Customer": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const clientes_delete_definition = {
  name: "tray_clientes_delete",
  description: 'Excluir cliente (DELETE /customers/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function clientes_delete_execute(
  input: z.infer<typeof clientes_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: clientes_list_definition, execute: clientes_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: clientes_get_definition, execute: clientes_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: clientes_create_definition, execute: clientes_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: clientes_update_definition, execute: clientes_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: clientes_delete_definition, execute: clientes_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
