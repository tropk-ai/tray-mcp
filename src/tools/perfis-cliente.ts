// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/perfis-cliente/SKILL.md
// Skill: tray-perfis-cliente
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const perfis_cliente_list_definition = {
  name: "tray_perfis_cliente_list",
  description: 'Listar perfis de clientes (GET /customers/profiles)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_list_execute(
  input: z.infer<typeof perfis_cliente_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/profiles`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const perfis_cliente_get_definition = {
  name: "tray_perfis_cliente_get",
  description: 'Consultar dados de um perfil por ID (GET /customers/profiles/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_get_execute(
  input: z.infer<typeof perfis_cliente_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/profiles/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const perfis_cliente_create_definition = {
  name: "tray_perfis_cliente_create",
  description: 'Cadastrar novo perfil (POST /customers/profiles)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_create_execute(
  input: z.infer<typeof perfis_cliente_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/profiles`;
    const body = { "Profile": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const perfis_cliente_update_definition = {
  name: "tray_perfis_cliente_update",
  description: 'Atualizar dados do perfil (PUT /customers/profiles/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_update_execute(
  input: z.infer<typeof perfis_cliente_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/profiles/${encodeURIComponent(String(input.id))}`;
    const body = { "Profile": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const perfis_cliente_delete_definition = {
  name: "tray_perfis_cliente_delete",
  description: 'Excluir perfil (DELETE /customers/profiles/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_delete_execute(
  input: z.infer<typeof perfis_cliente_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/profiles/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const perfis_cliente_create_profiles_definition = {
  name: "tray_perfis_cliente_create_profiles",
  description: 'Associar cliente a um perfil (POST /customers/:customer_id/profiles/:profile_id)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    profile_id: z.union([z.string(), z.number()]).describe('Path parameter profile_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_create_profiles_execute(
  input: z.infer<typeof perfis_cliente_create_profiles_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/profiles/${encodeURIComponent(String(input.profile_id))}`;
    const body = { "Profile": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const perfis_cliente_delete_profiles_definition = {
  name: "tray_perfis_cliente_delete_profiles",
  description: 'Desassociar cliente de um perfil (DELETE /customers/:customer_id/profiles/:profile_id)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    profile_id: z.union([z.string(), z.number()]).describe('Path parameter profile_id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function perfis_cliente_delete_profiles_execute(
  input: z.infer<typeof perfis_cliente_delete_profiles_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/profiles/${encodeURIComponent(String(input.profile_id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: perfis_cliente_list_definition, execute: perfis_cliente_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_get_definition, execute: perfis_cliente_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_create_definition, execute: perfis_cliente_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_update_definition, execute: perfis_cliente_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_delete_definition, execute: perfis_cliente_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_create_profiles_definition, execute: perfis_cliente_create_profiles_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: perfis_cliente_delete_profiles_definition, execute: perfis_cliente_delete_profiles_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
