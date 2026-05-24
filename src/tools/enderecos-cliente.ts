// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/enderecos-cliente/SKILL.md
// Skill: tray-enderecos-cliente
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const enderecos_cliente_get_addresses_definition = {
  name: "tray_enderecos_cliente_get_addresses",
  description: 'Listar endereços de um cliente (GET /customers/:customer_id/addresses)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function enderecos_cliente_get_addresses_execute(
  input: z.infer<typeof enderecos_cliente_get_addresses_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/addresses`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const enderecos_cliente_get_definition = {
  name: "tray_enderecos_cliente_get",
  description: 'Consultar endereço específico por ID (GET /customers/:customer_id/addresses/:id)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function enderecos_cliente_get_execute(
  input: z.infer<typeof enderecos_cliente_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/addresses/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const enderecos_cliente_create_addresses_definition = {
  name: "tray_enderecos_cliente_create_addresses",
  description: 'Cadastrar novo endereço para o cliente (POST /customers/:customer_id/addresses)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function enderecos_cliente_create_addresses_execute(
  input: z.infer<typeof enderecos_cliente_create_addresses_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/addresses`;
    const body = { "Address": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const enderecos_cliente_delete_definition = {
  name: "tray_enderecos_cliente_delete",
  description: 'Excluir endereço do cliente (DELETE /customers/:customer_id/addresses/:id)',
  inputSchema: z.object({
    customer_id: z.union([z.string(), z.number()]).describe('Path parameter customer_id'),
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function enderecos_cliente_delete_execute(
  input: z.infer<typeof enderecos_cliente_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/customers/${encodeURIComponent(String(input.customer_id))}/addresses/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: enderecos_cliente_get_addresses_definition, execute: enderecos_cliente_get_addresses_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: enderecos_cliente_get_definition, execute: enderecos_cliente_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: enderecos_cliente_create_addresses_definition, execute: enderecos_cliente_create_addresses_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: enderecos_cliente_delete_definition, execute: enderecos_cliente_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
