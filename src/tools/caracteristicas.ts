// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/caracteristicas/SKILL.md
// Skill: tray-caracteristicas
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const caracteristicas_get_properties_definition = {
  name: "tray_caracteristicas_get_properties",
  description: 'Listar características de um produto (GET /products/:product_id/properties)',
  inputSchema: z.object({
    product_id: z.union([z.string(), z.number()]).describe('Path parameter product_id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function caracteristicas_get_properties_execute(
  input: z.infer<typeof caracteristicas_get_properties_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.product_id))}/properties`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const caracteristicas_create_properties_definition = {
  name: "tray_caracteristicas_create_properties",
  description: 'Cadastrar ou atualizar característica no produto (POST /products/:product_id/properties)',
  inputSchema: z.object({
    product_id: z.union([z.string(), z.number()]).describe('Path parameter product_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function caracteristicas_create_properties_execute(
  input: z.infer<typeof caracteristicas_create_properties_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.product_id))}/properties`;
    const body = { "Property": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const caracteristicas_create_definition = {
  name: "tray_caracteristicas_create",
  description: 'Criar característica global (reutilizável em vários produtos) (POST /properties)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function caracteristicas_create_execute(
  input: z.infer<typeof caracteristicas_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/properties`;
    const body = { "Property": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const caracteristicas_delete_definition = {
  name: "tray_caracteristicas_delete",
  description: 'Excluir característica de um produto (DELETE /products/:product_id/properties/:id)',
  inputSchema: z.object({
    product_id: z.union([z.string(), z.number()]).describe('Path parameter product_id'),
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function caracteristicas_delete_execute(
  input: z.infer<typeof caracteristicas_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.product_id))}/properties/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: caracteristicas_get_properties_definition, execute: caracteristicas_get_properties_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: caracteristicas_create_properties_definition, execute: caracteristicas_create_properties_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: caracteristicas_create_definition, execute: caracteristicas_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: caracteristicas_delete_definition, execute: caracteristicas_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
