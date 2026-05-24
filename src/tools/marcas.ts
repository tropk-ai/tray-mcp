// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/marcas/SKILL.md
// Skill: tray-marcas
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const marcas_list_definition = {
  name: "tray_marcas_list",
  description: 'Listagem de marcas com paginação e filtros (GET /products/brands)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function marcas_list_execute(
  input: z.infer<typeof marcas_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/brands`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const marcas_get_definition = {
  name: "tray_marcas_get",
  description: 'Consultar dados de uma marca por ID (GET /products/brands/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function marcas_get_execute(
  input: z.infer<typeof marcas_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/brands/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const marcas_create_definition = {
  name: "tray_marcas_create",
  description: 'Cadastrar nova marca (POST /products/brands)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function marcas_create_execute(
  input: z.infer<typeof marcas_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/brands`;
    const body = { "Brand": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const marcas_update_definition = {
  name: "tray_marcas_update",
  description: 'Atualizar dados da marca (PUT /products/brands/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function marcas_update_execute(
  input: z.infer<typeof marcas_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/brands/${encodeURIComponent(String(input.id))}`;
    const body = { "Brand": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const marcas_delete_definition = {
  name: "tray_marcas_delete",
  description: 'Excluir marca (DELETE /products/brands/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function marcas_delete_execute(
  input: z.infer<typeof marcas_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/brands/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: marcas_list_definition, execute: marcas_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: marcas_get_definition, execute: marcas_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: marcas_create_definition, execute: marcas_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: marcas_update_definition, execute: marcas_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: marcas_delete_definition, execute: marcas_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
