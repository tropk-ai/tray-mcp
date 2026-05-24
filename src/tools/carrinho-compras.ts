// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/carrinho-compras/SKILL.md
// Skill: tray-carrinho-compras
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const carrinho_compras_get_definition = {
  name: "tray_carrinho_compras_get",
  description: 'Obter dados do carrinho (GET /carts/{session_id})',
  inputSchema: z.object({
    session_id: z.union([z.string(), z.number()]).describe('Path parameter session_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_get_execute(
  input: z.infer<typeof carrinho_compras_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts/${encodeURIComponent(String(input.session_id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const carrinho_compras_get_complete_definition = {
  name: "tray_carrinho_compras_get_complete",
  description: 'Obter dados completos do carrinho (GET /carts/{session_id}/complete)',
  inputSchema: z.object({
    session_id: z.union([z.string(), z.number()]).describe('Path parameter session_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_get_complete_execute(
  input: z.infer<typeof carrinho_compras_get_complete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts/${encodeURIComponent(String(input.session_id))}/complete`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const carrinho_compras_create_definition = {
  name: "tray_carrinho_compras_create",
  description: 'Criar carrinho (POST /carts)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_create_execute(
  input: z.infer<typeof carrinho_compras_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts`;
    const body = { "Cart": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const carrinho_compras_create_kit_definition = {
  name: "tray_carrinho_compras_create_kit",
  description: 'Criar carrinho com kit de produtos (POST /carts/kit)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_create_kit_execute(
  input: z.infer<typeof carrinho_compras_create_kit_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts/kit`;
    const body = { "Cart": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const carrinho_compras_update_definition = {
  name: "tray_carrinho_compras_update",
  description: 'Atualizar carrinho (PUT /carts/{session_id})',
  inputSchema: z.object({
    session_id: z.union([z.string(), z.number()]).describe('Path parameter session_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_update_execute(
  input: z.infer<typeof carrinho_compras_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts/${encodeURIComponent(String(input.session_id))}`;
    const body = { "Cart": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const carrinho_compras_delete_definition = {
  name: "tray_carrinho_compras_delete",
  description: 'Excluir carrinho (DELETE /carts/{session_id})',
  inputSchema: z.object({
    session_id: z.union([z.string(), z.number()]).describe('Path parameter session_id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function carrinho_compras_delete_execute(
  input: z.infer<typeof carrinho_compras_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts/${encodeURIComponent(String(input.session_id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: carrinho_compras_get_definition, execute: carrinho_compras_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: carrinho_compras_get_complete_definition, execute: carrinho_compras_get_complete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: carrinho_compras_create_definition, execute: carrinho_compras_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: carrinho_compras_create_kit_definition, execute: carrinho_compras_create_kit_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: carrinho_compras_update_definition, execute: carrinho_compras_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: carrinho_compras_delete_definition, execute: carrinho_compras_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
