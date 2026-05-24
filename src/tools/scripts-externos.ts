// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/scripts-externos/SKILL.md
// Skill: tray-scripts-externos
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const scripts_externos_list_definition = {
  name: "tray_scripts_externos_list",
  description: 'Listagem de scripts externos (GET /scripts)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function scripts_externos_list_execute(
  input: z.infer<typeof scripts_externos_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/scripts`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const scripts_externos_create_definition = {
  name: "tray_scripts_externos_create",
  description: 'Cadastrar script externo (POST /scripts)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function scripts_externos_create_execute(
  input: z.infer<typeof scripts_externos_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/scripts`;
    const body = { "Script": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const scripts_externos_update_definition = {
  name: "tray_scripts_externos_update",
  description: 'Atualizar script (PUT /scripts/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function scripts_externos_update_execute(
  input: z.infer<typeof scripts_externos_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/scripts/${encodeURIComponent(String(input.id))}`;
    const body = { "Script": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const scripts_externos_delete_definition = {
  name: "tray_scripts_externos_delete",
  description: 'Excluir script (DELETE /scripts/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function scripts_externos_delete_execute(
  input: z.infer<typeof scripts_externos_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/scripts/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: scripts_externos_list_definition, execute: scripts_externos_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: scripts_externos_create_definition, execute: scripts_externos_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: scripts_externos_update_definition, execute: scripts_externos_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: scripts_externos_delete_definition, execute: scripts_externos_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
