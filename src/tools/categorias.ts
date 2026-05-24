// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/categorias/SKILL.md
// Skill: tray-categorias
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const categorias_list_definition = {
  name: "tray_categorias_list",
  description: 'Consultar árvore de categorias (GET /categories)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_list_execute(
  input: z.infer<typeof categorias_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const categorias_list_all_definition = {
  name: "tray_categorias_list_all",
  description: 'Consultar dados de todas as categorias (GET /categories/all)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_list_all_execute(
  input: z.infer<typeof categorias_list_all_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories/all`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const categorias_get_definition = {
  name: "tray_categorias_get",
  description: 'Consultar dados de uma categoria por ID (GET /categories/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_get_execute(
  input: z.infer<typeof categorias_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const categorias_create_definition = {
  name: "tray_categorias_create",
  description: 'Cadastrar nova categoria (POST /categories)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_create_execute(
  input: z.infer<typeof categorias_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories`;
    const body = { "Category": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const categorias_update_definition = {
  name: "tray_categorias_update",
  description: 'Atualizar dados da categoria (PUT /categories/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_update_execute(
  input: z.infer<typeof categorias_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories/${encodeURIComponent(String(input.id))}`;
    const body = { "Category": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const categorias_reorder_definition = {
  name: "tray_categorias_reorder",
  description: 'Atualizar ordem da categoria (PUT /categories/:id/order)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_reorder_execute(
  input: z.infer<typeof categorias_reorder_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories/${encodeURIComponent(String(input.id))}/order`;
    const body = { "Order": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const categorias_delete_definition = {
  name: "tray_categorias_delete",
  description: 'Excluir categoria (DELETE /categories/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function categorias_delete_execute(
  input: z.infer<typeof categorias_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/categories/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: categorias_list_definition, execute: categorias_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_list_all_definition, execute: categorias_list_all_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_get_definition, execute: categorias_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_create_definition, execute: categorias_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_update_definition, execute: categorias_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_reorder_definition, execute: categorias_reorder_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: categorias_delete_definition, execute: categorias_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
