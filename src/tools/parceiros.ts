// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/parceiros/SKILL.md
// Skill: tray-parceiros
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const parceiros_list_definition = {
  name: "tray_parceiros_list",
  description: 'Listagem de parceiros (GET /partners)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function parceiros_list_execute(
  input: z.infer<typeof parceiros_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/partners`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const parceiros_get_definition = {
  name: "tray_parceiros_get",
  description: 'Consultar dados do parceiro (GET /partners/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function parceiros_get_execute(
  input: z.infer<typeof parceiros_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/partners/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const parceiros_create_definition = {
  name: "tray_parceiros_create",
  description: 'Cadastrar parceiro (POST /partners)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function parceiros_create_execute(
  input: z.infer<typeof parceiros_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/partners`;
    const body = { "Partner": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const parceiros_update_definition = {
  name: "tray_parceiros_update",
  description: 'Atualizar dados do parceiro (PUT /partners/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function parceiros_update_execute(
  input: z.infer<typeof parceiros_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/partners/${encodeURIComponent(String(input.id))}`;
    const body = { "Partner": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const parceiros_delete_definition = {
  name: "tray_parceiros_delete",
  description: 'Excluir parceiro (DELETE /partners/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function parceiros_delete_execute(
  input: z.infer<typeof parceiros_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/partners/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: parceiros_list_definition, execute: parceiros_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: parceiros_get_definition, execute: parceiros_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: parceiros_create_definition, execute: parceiros_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: parceiros_update_definition, execute: parceiros_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: parceiros_delete_definition, execute: parceiros_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
