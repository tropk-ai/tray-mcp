// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/variacoes/SKILL.md
// Skill: tray-variacoes
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const variacoes_list_definition = {
  name: "tray_variacoes_list",
  description: 'Listagem de variações com paginação (GET /variants)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function variacoes_list_execute(
  input: z.infer<typeof variacoes_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const variacoes_get_definition = {
  name: "tray_variacoes_get",
  description: 'Consultar dados de uma variação (GET /variants/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function variacoes_get_execute(
  input: z.infer<typeof variacoes_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const variacoes_create_definition = {
  name: "tray_variacoes_create",
  description: 'Cadastrar nova variação (POST /variants)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function variacoes_create_execute(
  input: z.infer<typeof variacoes_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants`;
    const body = { "Variant": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const variacoes_update_definition = {
  name: "tray_variacoes_update",
  description: 'Atualizar dados da variação (PUT /variants/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function variacoes_update_execute(
  input: z.infer<typeof variacoes_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants/${encodeURIComponent(String(input.id))}`;
    const body = { "Variant": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const variacoes_delete_definition = {
  name: "tray_variacoes_delete",
  description: 'Excluir variação (DELETE /variants/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function variacoes_delete_execute(
  input: z.infer<typeof variacoes_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: variacoes_list_definition, execute: variacoes_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: variacoes_get_definition, execute: variacoes_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: variacoes_create_definition, execute: variacoes_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: variacoes_update_definition, execute: variacoes_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: variacoes_delete_definition, execute: variacoes_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
