// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/produtos/SKILL.md
// Skill: tray-produtos
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const produtos_list_definition = {
  name: "tray_produtos_list",
  description: 'Listagem de produtos com paginação, filtros e ordenação (GET /products)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_list_execute(
  input: z.infer<typeof produtos_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const produtos_get_definition = {
  name: "tray_produtos_get",
  description: 'Consultar dados detalhados de um produto (GET /products/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_get_execute(
  input: z.infer<typeof produtos_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const produtos_create_definition = {
  name: "tray_produtos_create",
  description: 'Cadastrar novo produto (POST /products)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_create_execute(
  input: z.infer<typeof produtos_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products`;
    const body = { "Product": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const produtos_update_definition = {
  name: "tray_produtos_update",
  description: 'Atualizar dados do produto (PUT /products/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_update_execute(
  input: z.infer<typeof produtos_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}`;
    const body = { "Product": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const produtos_delete_definition = {
  name: "tray_produtos_delete",
  description: 'Excluir produto (DELETE /products/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_delete_execute(
  input: z.infer<typeof produtos_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const produtos_delete_kits_definition = {
  name: "tray_produtos_delete_kits",
  description: 'Excluir kit de produto (DELETE /kits/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function produtos_delete_kits_execute(
  input: z.infer<typeof produtos_delete_kits_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/kits/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: produtos_list_definition, execute: produtos_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: produtos_get_definition, execute: produtos_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: produtos_create_definition, execute: produtos_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: produtos_update_definition, execute: produtos_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: produtos_delete_definition, execute: produtos_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: produtos_delete_kits_definition, execute: produtos_delete_kits_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
