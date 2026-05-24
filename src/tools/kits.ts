// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/kits/SKILL.md
// Skill: tray-kits
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const kits_list_definition = {
  name: "tray_kits_list",
  description: 'Listagem de kits com paginação (GET /products/kits)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function kits_list_execute(
  input: z.infer<typeof kits_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/kits`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const kits_get_definition = {
  name: "tray_kits_get",
  description: 'Consultar dados de um kit por ID (GET /products/kits/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function kits_get_execute(
  input: z.infer<typeof kits_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/kits/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const kits_create_definition = {
  name: "tray_kits_create",
  description: 'Cadastrar novo kit (POST /products/kits)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function kits_create_execute(
  input: z.infer<typeof kits_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/kits`;
    const body = { "Kit": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const kits_update_definition = {
  name: "tray_kits_update",
  description: 'Atualizar dados do kit (PUT /products/kits/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function kits_update_execute(
  input: z.infer<typeof kits_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/kits/${encodeURIComponent(String(input.id))}`;
    const body = { "Kit": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const tools = [
  { definition: kits_list_definition, execute: kits_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: kits_get_definition, execute: kits_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: kits_create_definition, execute: kits_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: kits_update_definition, execute: kits_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
